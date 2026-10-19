/**
 * ---------------------------------------------------------------------------
 *  Capa de datos desacoplada del frontend
 * ---------------------------------------------------------------------------
 *  Orden de prioridad:
 *    1. GET /api/standings y /api/season   (proxy Express/Vite → MotoGP real)
 *    2. localStorage                       (caché del propio navegador)
 *    3. src/data/snapshot.json             (fallback "offline" real)
 *
 *  El proxy devuelve CORS habilitado y sin caché intermedia en el navegador,
 *  así que aquí solo gestionamos: timeout, persistencia local, polling
 *  (60 s en calma / 15 s en fin de semana de carrera) y estados de UI.
 *
 *  CAMBIAR LA FUENTE DE DATOS:
 *    - Sustituye el upstream en `server/api.mjs` (recomendado) manteniendo la
 *      forma de `StandingsData` / `SeasonData`, o
 *    - cambia `API_BASE`/rutas de este archivo si expones otra API, o
 *    - regenera el fallback con `npm run snapshot`.
 * ---------------------------------------------------------------------------
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import snapshot from './snapshot.json';

export const SEASON_YEAR = 2026;
export const BEZZECCHI_NUMBER = 72;
export const BEZZECCHI_NAME = 'Marco Bezzecchi';

export type DataSource = 'live' | 'cache' | 'mock';
export type LiveDataStatus = 'loading' | 'ready' | 'error';

export interface RiderStanding {
  position: number;
  name: string;
  number: number;
  country: string;
  countryIso: string;
  team: string;
  constructor: string;
  points: number;
  raceWins: number;
  podiums: number;
  sprintWins: number;
  sprintPodiums: number;
  positionChange: number;
}

export interface RaceWeekend {
  active: boolean;
  name: string | null;
  countryIso: string | null;
  dateStart: string | null;
  dateEnd: string | null;
}

export interface StandingsData {
  source: DataSource;
  fetchedAt: string;
  season: number;
  raceWeekend: RaceWeekend;
  riders: RiderStanding[];
  stale?: boolean;
  error?: string;
}

export interface RoundResult {
  grid: number | null;
  racePos: number | null;
  racePoints: number;
  raceStatus: string | null;
  started: boolean;
  sprintPos: number | null;
  sprintPoints: number;
  sprintStatus: string | null;
  sprintStarted: boolean;
  fastestLapRider: string | null;
  poleNumber: number | null;
}

export type RoundStatus = 'finished' | 'live' | 'upcoming';

export interface Round {
  round: number;
  name: string;
  shortName: string;
  circuit: string;
  country: string;
  countryIso: string;
  dateStart: string;
  dateEnd: string;
  raceDate: string;
  status: RoundStatus;
  result: RoundResult | null;
}

export interface EvolutionPoint {
  round: number;
  shortName: string;
  name: string;
  points: number;
  leaderPoints: number;
}

export interface SeasonStats {
  poles: number;
  fastestLaps: number;
  starts: number;
  sprintStarts: number;
  dnfs: number;
}

export interface SeasonData {
  source: DataSource;
  fetchedAt: string;
  season: number;
  raceWeekend: RaceWeekend;
  rounds: Round[];
  evolution: EvolutionPoint[];
  stats: SeasonStats;
  bezzecchi: RiderStanding | null;
  leader: { name: string; number: number; points: number } | null;
  nextRace: Round | null;
}

export interface LiveDataState {
  standings: StandingsData | null;
  season: SeasonData | null;
  status: LiveDataStatus;
  error: string | null;
  source: DataSource | null;
  lastUpdated: string | null;
}

export interface LiveData extends LiveDataState {
  raceWeekend: RaceWeekend;
  isLive: boolean;
  refresh: () => void;
}

interface SnapshotFile {
  generatedAt: string;
  note: string;
  standings: StandingsData;
  season: SeasonData;
}

const SNAPSHOT = snapshot as unknown as SnapshotFile;

const API_BASE = '/api';
const CACHE_KEY_STANDINGS = 'bz72:standings';
const CACHE_KEY_SEASON = 'bz72:season';
const POLL_IDLE_MS = 60_000;
const POLL_LIVE_MS = 15_000;
const REQUEST_TIMEOUT_MS = 9_000;

/* ------------------------------- fetch base ------------------------------ */

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function readCache<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado / cuota llena: se ignora */
  }
}

/**
 * 1) API viva → 2) localStorage → 3) snapshot embebido.
 * Nunca lanza: siempre devuelve datos + procedencia + mensaje de error.
 */
async function resolve<T extends { source: DataSource; fetchedAt: string }>(
  path: string,
  cacheKey: string,
  fallback: T,
): Promise<{ data: T; source: DataSource; error: string | null }> {
  try {
    const data = await getJson<T>(path);
    writeCache(cacheKey, data);
    return { data, source: 'live', error: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const cached = readCache<T>(cacheKey);
    if (cached) {
      return { data: { ...cached, source: 'cache' }, source: 'cache', error: message };
    }
    return { data: { ...fallback, source: 'mock' }, source: 'mock', error: message };
  }
}

/* -------------------------------- store ---------------------------------- */

const initialState: LiveDataState = {
  standings: null,
  season: null,
  status: 'loading',
  error: null,
  source: null,
  lastUpdated: null,
};

let state: LiveDataState = initialState;
const listeners = new Set<() => void>();
let pollTimer: number | null = null;
let loading: Promise<void> | null = null;

function emit(patch: Partial<LiveDataState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

async function load(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const [standingsRes, seasonRes] = await Promise.all([
      resolve<StandingsData>('/standings', CACHE_KEY_STANDINGS, {
        ...SNAPSHOT.standings,
        source: 'mock',
      }),
      resolve<SeasonData>('/season', CACHE_KEY_SEASON, { ...SNAPSHOT.season, source: 'mock' }),
    ]);

    const sources = [standingsRes.source, seasonRes.source];
    const source: DataSource = sources.includes('live')
      ? 'live'
      : sources.includes('cache')
        ? 'cache'
        : 'mock';
    const error = seasonRes.error ?? standingsRes.error;
    const lastUpdated = standingsRes.data.fetchedAt || seasonRes.data.fetchedAt || SNAPSHOT.generatedAt;

    emit({
      standings: standingsRes.data,
      season: seasonRes.data,
      status: 'ready',
      source,
      error: source === 'live' ? null : error,
      lastUpdated,
    });
  })().finally(() => {
    loading = null;
  });
  return loading;
}

function scheduleNext(): void {
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  if (listeners.size === 0) return;
  const weekendActive = Boolean(state.standings?.raceWeekend.active || state.season?.raceWeekend.active);
  const interval = weekendActive ? POLL_LIVE_MS : POLL_IDLE_MS;
  pollTimer = window.setTimeout(() => {
    void load().finally(scheduleNext);
  }, interval);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    void load().finally(scheduleNext);
    document.addEventListener('visibilitychange', onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (pollTimer !== null) window.clearTimeout(pollTimer);
      pollTimer = null;
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}

function onVisibility(): void {
  if (document.visibilityState === 'visible' && listeners.size > 0) {
    void load().finally(scheduleNext);
  }
}

function getSnapshot(): LiveDataState {
  return state;
}

/** Suscripción compartida: todos los componentes usan UN solo polling. */
export function useLiveData(): LiveData {
  const snapshotState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const refresh = useCallback(() => {
    void load().finally(scheduleNext);
  }, []);

  const raceWeekend = snapshotState.standings?.raceWeekend ?? snapshotState.season?.raceWeekend ?? {
    active: false,
    name: null,
    countryIso: null,
    dateStart: null,
    dateEnd: null,
  };

  return useMemo(
    () => ({ ...snapshotState, raceWeekend, isLive: raceWeekend.active, refresh }),
    [snapshotState, raceWeekend, refresh],
  );
}

/** Dispara la carga sin suscribirse (útil en pruebas). */
export function preloadLiveData(): Promise<void> {
  return load();
}

/* ------------------------------- helpers --------------------------------- */

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  day: '2-digit',
  month: '2-digit',
});

export function formatLastUpdate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function isRaceWeekendActive(data: LiveDataState): boolean {
  return Boolean(data.standings?.raceWeekend.active || data.season?.raceWeekend.active);
}

/** Puntos del líder de los datos (o del propio Bezzecchi si no hay datos). */
export function getLeaderPoints(standings: StandingsData | null): number | null {
  if (!standings || standings.riders.length === 0) return null;
  return standings.riders[0].points;
}

export function getBezzecchi(standings: StandingsData | null): RiderStanding | null {
  if (!standings) return null;
  return standings.riders.find((rider) => rider.number === BEZZECCHI_NUMBER) ?? null;
}
