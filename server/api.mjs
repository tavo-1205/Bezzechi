/**
 * ---------------------------------------------------------------------------
 *  Proxy de datos MotoGP (capa de backend mínima)
 * ---------------------------------------------------------------------------
 *  Fuente real (pública, sin token y sin CORS bloqueante):
 *    https://api.motogp.pulselive.com/motogp/v1/...
 *
 *  Endpoints usados:
 *    /results/seasons                                  -> uuid de temporada
 *    /results/categories?seasonUuid=                   -> uuid de MotoGP
 *    /results/events?seasonUuid=                       -> calendario
 *    /results/sessions?...&eventUuid=                  -> sesiones (RAC/SPR/Q)
 *    /results/session/{id}/classification?test=false   -> resultados + records
 *    /results/standings?seasonUuid=&categoryUuid=      -> clasificación mundial
 *
 *  Estrategia de caché (en memoria, en el proceso):
 *    - clasificación: 45 s (20 s en fin de semana de carrera)
 *    - calendario/temporada: 5 min (60 s en fin de semana)
 *    - sesiones/resultados de carreras terminadas: indefinidos (son inmutables)
 *    - meta (uuid de temporada): 6 h
 *  Si el upstream falla se sirve el último valor conocido (stale) antes de
 *  devolver 503. El cliente, además, guarda su propia copia en localStorage
 *  y por último cae en src/data/snapshot.json.
 *
 *  Para cambiar de fuente de datos: sustituye `fetchJson` por tu cliente
 *  (Sportradar, etc.) y conserva la forma de los objetos devueltos por
 *  `fetchStandings()` / `fetchSeason()`: es lo único que consume el frontend.
 * ---------------------------------------------------------------------------
 */

const UPSTREAM = 'https://api.motogp.pulselive.com/motogp/v1';
const RIDER_NAME = 'Marco Bezzecchi';
const RIDER_NUMBER = 72;
const YEAR = Number(process.env.SEASON_YEAR || new Date().getFullYear());

const TTL = {
  meta: 6 * 60 * 60 * 1000,
  events: 10 * 60 * 1000,
  standingsIdle: 45 * 1000,
  standingsLive: 20 * 1000,
  seasonIdle: 5 * 60 * 1000,
  seasonLive: 60 * 1000,
  sessionsIdle: 60 * 1000,
  sessionsLive: 20 * 1000,
  classificationLive: 15 * 1000,
  immutable: 365 * 24 * 60 * 60 * 1000,
  stale: 24 * 60 * 60 * 1000,
};

/** @type {Map<string, { value: any, expires: number }>} */
const CACHE = new Map();
/** @type {Map<string, Promise<any>>} */
const INFLIGHT = new Map();

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return undefined;
  if (entry.expires > Date.now()) return entry.value;
  return undefined;
}

/** Último valor conocido aunque haya caducado (para respuestas "stale"). */
function cachePeek(key) {
  return CACHE.get(key)?.value;
}

function cacheSet(key, value, ttl) {
  CACHE.set(key, { value, expires: Date.now() + ttl });
}

async function fetchJson(url, timeoutMs = 9000) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'bezzecchi-72-fansite/1.0 (+proxy)' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upstream ${res.status} en ${url}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** fetchJson con caché y deduplicación de peticiones en vuelo. */
async function getJson(url, ttl) {
  const key = `u:${url}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  const pending = INFLIGHT.get(key);
  if (pending) return pending;
  const promise = fetchJson(url)
    .then((value) => {
      cacheSet(key, value, ttl);
      return value;
    })
    .finally(() => INFLIGHT.delete(key));
  INFLIGHT.set(key, promise);
  return promise;
}

/** Igual que getJson pero devuelve `fallback` si el upstream falla. */
async function getJsonSafe(url, ttl, fallback = null) {
  try {
    return await getJson(url, ttl);
  } catch {
    return fallback;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const isPastEvent = (event) => String(event.date_end) < today();
const isTodayEvent = (event) => String(event.date_start) <= today() && String(event.date_end) >= today();

/** Ejecuta `worker` sobre `items` con un máximo de `limit` en paralelo. */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function getSeasonMeta() {
  const cached = cacheGet('meta');
  if (cached) return cached;
  const seasons = await fetchJson(`${UPSTREAM}/results/seasons`);
  const season = seasons.find((s) => s.year === YEAR) || seasons.find((s) => s.current) || seasons[0];
  if (!season) throw new Error('No se encontró la temporada en el upstream');
  const categories = await fetchJson(`${UPSTREAM}/results/categories?seasonUuid=${season.id}`);
  const category = categories.find((c) => c.legacy_id === 3) || categories[0];
  const meta = { seasonId: season.id, categoryId: category.id, year: season.year };
  cacheSet('meta', meta, TTL.meta);
  return meta;
}

/** Calendario de carreras (sin tests), ordenado cronológicamente. */
async function getEvents() {
  const cached = cacheGet('events');
  if (cached) return cached;
  const { seasonId } = await getSeasonMeta();
  const all = await getJson(`${UPSTREAM}/results/events?seasonUuid=${seasonId}`, TTL.events);
  const list = all
    .filter((event) => !event.test)
    .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));
  cacheSet('events', list, TTL.events);
  return list;
}

function normalizeRider(entry) {
  return {
    position: entry.position ?? 0,
    name: entry.rider?.full_name ?? '—',
    number: entry.rider?.number ?? 0,
    country: entry.rider?.country?.name ?? '',
    countryIso: entry.rider?.country?.iso ?? '',
    team: entry.team?.name ?? '',
    constructor: entry.constructor?.name ?? '',
    points: entry.points ?? 0,
    raceWins: entry.race_wins ?? 0,
    podiums: entry.podiums ?? 0,
    sprintWins: entry.sprint_wins ?? 0,
    sprintPodiums: entry.sprint_podiums ?? 0,
    positionChange: entry.position_change ?? 0,
  };
}

function findRider(classification, name = RIDER_NAME) {
  return classification?.find((entry) => entry.rider?.full_name === name) ?? null;
}

function raceWeekendInfo(events) {
  const active = events.find(isTodayEvent) ?? null;
  return {
    active: Boolean(active),
    name: active ? active.sponsored_name || active.name : null,
    countryIso: active?.country?.iso ?? null,
    dateStart: active?.date_start ?? null,
    dateEnd: active?.date_end ?? null,
  };
}

/** Clasificación mundial de pilotos (normalizada). */
export async function fetchStandings(options = {}) {
  const force = options.force === true;
  const weekend = raceWeekendInfo(await getEvents());
  const ttl = weekend.active ? TTL.standingsLive : TTL.standingsIdle;
  if (!force) {
    const cached = cacheGet('standings');
    if (cached) return { ...cached, raceWeekend: weekend };
  }
  const { seasonId, categoryId } = await getSeasonMeta();
  const raw = await fetchJson(
    `${UPSTREAM}/results/standings?seasonUuid=${seasonId}&categoryUuid=${categoryId}`,
  );
  const payload = {
    source: 'live',
    fetchedAt: new Date().toISOString(),
    season: YEAR,
    raceWeekend: weekend,
    riders: (raw.classification ?? []).filter((e) => e.rider?.full_name).map(normalizeRider),
  };
  cacheSet('standings', payload, TTL.stale);
  return payload;
}

async function getSessions(event, past) {
  const { seasonId, categoryId } = await getSeasonMeta();
  const url = `${UPSTREAM}/results/sessions?seasonUuid=${seasonId}&categoryUuid=${categoryId}&eventUuid=${event.id}`;
  return getJson(url, past ? TTL.immutable : TTL.sessionsIdle);
}

function sessionTtl(session, past) {
  if (past || session?.status === 'FINISHED') return TTL.immutable;
  return TTL.classificationLive;
}

async function getClassification(sessionId, ttl) {
  if (!sessionId) return null;
  return getJsonSafe(`${UPSTREAM}/results/session/${sessionId}/classification?test=false`, ttl, null);
}

function entryOf(classification, name) {
  const list = Array.isArray(classification) ? classification : classification?.classification;
  if (!list) return null;
  return findRider(list, name);
}

function raceEntryOf(classification, name) {
  const entry = entryOf(classification, name);
  if (!entry) return null;
  return {
    position: entry.position ?? null,
    points: entry.points ?? 0,
    status: entry.status ?? null,
  };
}

function qualifyEntryOf(classification, name) {
  const entry = entryOf(classification, name);
  if (!entry) return null;
  return { position: entry.position ?? null, bestLap: entry.best_lap?.time ?? null };
}

/** Construye toda la ronda: resultados, parrilla, vueltas rápidas y puntos. */
function buildRound(index, event, trackedNumbers) {
  return async () => {
    const past = isPastEvent(event);
    const sessions = (await getSessions(event, past)) ?? [];
    const race = sessions.find((s) => s.type === 'RAC') ?? null;
    const sprint = sessions.find((s) => s.type === 'SPR') ?? null;
    const qualifying = sessions
      .filter((s) => s.type === 'Q')
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .pop() ?? null;

    const finished = race?.status === 'FINISHED';
    const live = Boolean(race && race.status !== 'FINISHED' && !past && isTodayEvent(event));

    const base = {
      round: index + 1,
      name: event.sponsored_name || event.name,
      shortName: sessions[0]?.event?.short_name || event.country?.iso || `R${index + 1}`,
      circuit: race?.circuit || event.circuit?.name || '',
      country: event.country?.name || '',
      countryIso: event.country?.iso || '',
      dateStart: event.date_start,
      dateEnd: event.date_end,
      raceDate: race?.date ?? `${event.date_end}T13:00:00.000Z`,
      status: finished ? 'finished' : live ? 'live' : 'upcoming',
      result: null,
      points: null,
    };

    if (!finished && !live) return base;

    const ttlR = sessionTtl(race, past);
    const ttlS = sessionTtl(sprint, past);
    const ttlQ = sessionTtl(qualifying, past);
    const [raceCls, sprintCls, qualCls] = await Promise.all([
      getClassification(race?.id, ttlR),
      getClassification(sprint?.id, ttlS),
      getClassification(qualifying?.id, ttlQ),
    ]);

    const fastestLapRider = (raceCls?.records ?? []).find((r) => r.type === 'fastestLap')?.rider?.full_name ?? null;

    const perRider = {};
    for (const number of trackedNumbers) {
      const riderName = number === RIDER_NUMBER ? RIDER_NAME : null;
      perRider[number] = { racePoints: 0, sprintPoints: 0, name: riderName };
    }

    const result = {
      grid: null,
      racePos: null,
      racePoints: 0,
      raceStatus: null,
      started: false,
      sprintPos: null,
      sprintPoints: 0,
      sprintStatus: null,
      sprintStarted: false,
      fastestLapRider,
      poleNumber: null,
    };

    if (raceCls) {
      const bez = raceEntryOf(raceCls, RIDER_NAME);
      if (bez) {
        result.started = true;
        result.racePos = bez.position;
        result.racePoints = bez.points;
        result.raceStatus = bez.status;
        perRider[RIDER_NUMBER].racePoints = bez.points;
      }
      for (const number of trackedNumbers) {
        if (number === RIDER_NUMBER) continue;
        const entry = raceCls.classification?.find((e) => e.rider?.number === number);
        if (entry) {
          perRider[number].racePoints = entry.points ?? 0;
          perRider[number].name = entry.rider?.full_name ?? null;
        }
      }
    }

    if (sprintCls) {
      const bez = raceEntryOf(sprintCls, RIDER_NAME);
      if (bez) {
        result.sprintStarted = true;
        result.sprintPos = bez.position;
        result.sprintPoints = bez.points;
        result.sprintStatus = bez.status;
        perRider[RIDER_NUMBER].sprintPoints = bez.points;
      }
      for (const number of trackedNumbers) {
        if (number === RIDER_NUMBER) continue;
        const entry = sprintCls.classification?.find((e) => e.rider?.number === number);
        if (entry) perRider[number].sprintPoints = entry.points ?? 0;
      }
    }

    if (qualCls) {
      const gridEntry = raceEntryOf(qualCls, RIDER_NAME);
      result.grid = gridEntry?.position ?? null;
      const pole = qualCls.classification?.find((e) => e.position === 1);
      result.poleNumber = pole?.rider?.number ?? null;
    }

    return { ...base, result, perRider };
  };
}

let seasonInflight = null;

async function buildSeason() {
  const [events, standings] = await Promise.all([
    getEvents(),
    fetchStandings().catch(() => null),
  ]);

  const weekend = raceWeekendInfo(events);
  const leader = standings?.riders?.[0] ?? null;
  const tracked = new Set([RIDER_NUMBER]);
  if (leader && leader.number) tracked.add(leader.number);

  const rounds = await pool(events, 6, (event, index) => buildRound(index, event, tracked)());

  const finishedRounds = rounds.filter((r) => r.status === 'finished');
  let cumulativeBez = 0;
  let cumulativeLeader = 0;
  const evolution = [];
  const stats = { poles: 0, fastestLaps: 0, starts: 0, sprintStarts: 0, dnfs: 0 };

  for (const round of finishedRounds) {
    const bezPoints = (round.result?.racePoints ?? 0) + (round.result?.sprintPoints ?? 0);
    cumulativeBez += bezPoints;
    const leaderPoints =
      leader && round.perRider?.[leader.number]
        ? round.perRider[leader.number].racePoints + round.perRider[leader.number].sprintPoints
        : 0;
    cumulativeLeader += leaderPoints;

    if (round.result) {
      if (round.result.started) {
        stats.starts += 1;
        if (round.result.racePos === null) stats.dnfs += 1;
      }
      if (round.result.sprintStarted) stats.sprintStarts += 1;
      if (round.result.poleNumber === RIDER_NUMBER) stats.poles += 1;
      if (round.result.fastestLapRider === RIDER_NAME) stats.fastestLaps += 1;
    }

    evolution.push({
      round: round.round,
      shortName: round.shortName,
      name: round.name,
      points: cumulativeBez,
      leaderPoints: cumulativeLeader,
    });
  }

  const bezzecchi =
    standings?.riders?.find((r) => r.number === RIDER_NUMBER) ??
    standings?.riders?.find((r) => r.name === RIDER_NAME) ??
    null;

  const payload = {
    source: 'live',
    fetchedAt: new Date().toISOString(),
    season: YEAR,
    raceWeekend: weekend,
    rounds,
    evolution,
    stats,
    bezzecchi,
    leader: leader ? { name: leader.name, number: leader.number, points: leader.points } : null,
    nextRace: rounds.find((r) => r.status !== 'finished') ?? null,
  };
  cacheSet('season', payload, weekend.active ? TTL.seasonLive : TTL.seasonIdle);
  return payload;
}

export async function fetchSeason(options = {}) {
  const force = options.force === true;
  if (!force) {
    const cached = cacheGet('season');
    if (cached) return cached;
    if (seasonInflight) return seasonInflight;
  }
  seasonInflight = buildSeason().finally(() => {
    seasonInflight = null;
  });
  return seasonInflight;
}

/**
 * Devuelve la ruta relativa dentro de la API (`/standings`, `/season`,
 * `/health`) o `null` si la petición NO es de la API.
 *
 * - En `npm run dev` el middleware va "suelto" en Vite (Connect), así que
 *   cualquier otra ruta (HTML, módulos, fuentes…) debe pasar de largo con
 *   `next()`: si no, `index.html` se pierde.
 * - En producción se monta en Express con `app.use('/api', handler)`, donde
 *   `originalUrl` sí lleva el prefijo.
 */
function resolvePath(req) {
  const candidates = [req.originalUrl, req.url].filter(Boolean);
  const raw = candidates.sort((a, b) => b.length - a.length)[0] ?? '/';
  const path = raw.split('?')[0];
  if (path === '/api' || path.startsWith('/api/')) {
    const stripped = path.slice('/api'.length);
    return stripped === '' ? '/' : stripped;
  }
  return null;
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
  res.end(body);
}

/**
 * Middleware compatible con Express y con el Connect de Vite.
 * Montaje: `app.use('/api', handler)` (también funciona sin prefijo).
 */
export function createApiHandler() {
  return async function apiHandler(req, res, next) {
    const path = resolvePath(req);

    if (path === null) {
      // No es una ruta de la API: que siga el pipeline (Vite/Express).
      if (typeof next === 'function') {
        next();
        return;
      }
      sendJson(res, 404, { error: 'not_found', available: ['/api/standings', '/api/season', '/api/health'] });
      return;
    }

    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    try {
      if (path === '/' || path === '/health') {
        sendJson(res, 200, {
          ok: true,
          service: 'bezzecchi-72-live-api',
          upstream: UPSTREAM,
          season: YEAR,
          now: new Date().toISOString(),
        });
        return;
      }
      if (path === '/standings') {
        sendJson(res, 200, await fetchStandings());
        return;
      }
      if (path === '/season') {
        sendJson(res, 200, await fetchSeason());
        return;
      }
      sendJson(res, 404, { error: 'not_found', available: ['/standings', '/season', '/health'] });
    } catch (error) {
      const staleKey = path === '/season' ? 'season' : 'standings';
      const stale = cachePeek(staleKey);
      if (stale) {
        sendJson(res, 200, { ...stale, source: 'cache', stale: true, error: String(error?.message ?? error) });
        return;
      }
      sendJson(res, 503, {
        error: 'upstream_unavailable',
        message: String(error?.message ?? error),
      });
    }
  };
}
