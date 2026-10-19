import { useEffect, useRef, useState, type ReactElement } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { formatLastUpdate, useLiveData, type Round } from '../data/api';

/**
 * Calendario MotoGP 2026.
 *
 * - Todos los datos llegan del proxy existente vía `useLiveData()` (un único
 *   polling compartido: 60 s en calma / 15 s en fin de semana). Aquí NO se
 *   hace fetch ni se crea ningún temporizador de red propio.
 * - Cuenta atrás en vivo hacia `nextRace` con `setInterval(1 s)` (solo texto,
 *   así funciona igual con `prefers-reduced-motion`).
 * - Entrada de secciones coherente con el "recorrido": paneles con fade+y y
 *   cascada de tarjetas de ronda (solo al scroll, sin tocar la cuenta atrás ni
 *   la a11y; con `prefers-reduced-motion` sin animación).
 * - Fechas formateadas con `Intl.DateTimeFormat('es-ES')`: la API devuelve ISO
 *   con offset, así que el instante es correcto y se muestra en zona local.
 */

/* ------------------------------- formato --------------------------------- */

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const fmtDayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
const fmtMonth = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const fmtRaceShort = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const fmtRaceLong = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** ICU puede añadir un punto tras la abreviatura de mes ("oct."); lo limpia. */
const clean = (text: string): string => text.replace(/\s*\.$/, '').replace(/\s+/g, ' ').trim();

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** `2026-10-23` (solo fecha) se interpreta como fecha local, no como UTC. */
function parseDateOnly(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDayMonth(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : clean(fmtDayMonth.format(date));
}

function formatRace(iso: string, long: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return clean((long ? fmtRaceLong : fmtRaceShort).format(date));
}

function weekendLabel(startIso: string, endIso: string): string {
  const start = parseDateOnly(startIso);
  const end = parseDateOnly(endIso);
  if (!start || !end) return '—';
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${clean(fmtMonth.format(end))} ${end.getFullYear()}`;
  }
  return `${clean(fmtDayMonth.format(start))} – ${clean(fmtDayMonth.format(end))} ${end.getFullYear()}`;
}

/* ------------------------------- etiquetas -------------------------------- */

const COUNTRY_ES: Record<string, string> = {
  TH: 'Tailandia',
  BR: 'Brasil',
  US: 'Estados Unidos',
  ES: 'España',
  FR: 'Francia',
  IT: 'Italia',
  HU: 'Hungría',
  CZ: 'Chequia',
  NL: 'Países Bajos',
  DE: 'Alemania',
  GB: 'Gran Bretaña',
  SM: 'San Marino',
  AT: 'Austria',
  JP: 'Japón',
  ID: 'Indonesia',
  AU: 'Australia',
  MY: 'Malasia',
  QA: 'Catar',
  PT: 'Portugal',
};

const GP_ES: Record<string, string> = {
  THA: 'GP de Tailandia',
  BRA: 'GP de Brasil',
  USA: 'GP de los Estados Unidos',
  SPA: 'GP de España',
  FRA: 'GP de Francia',
  CAT: 'GP de Cataluña',
  ITA: 'GP de Italia',
  HUN: 'GP de Hungría',
  CZE: 'GP de Chequia',
  NED: 'GP de Países Bajos',
  GER: 'GP de Alemania',
  GBR: 'GP de Gran Bretaña',
  ARA: 'GP de Aragón',
  RSM: 'GP de San Marino',
  AUT: 'GP de Austria',
  JPN: 'GP de Japón',
  INA: 'GP de Indonesia',
  AUS: 'GP de Australia',
  MAL: 'GP de Malasia',
  QAT: 'GP de Catar',
  POR: 'GP de Portugal',
  VAL: 'GP de Valencia',
};

function countryEs(round: Round): string {
  return COUNTRY_ES[round.countryIso.trim().toUpperCase()] ?? round.country;
}

function gpLabel(round: Round): string {
  return GP_ES[round.shortName.trim().toUpperCase()] ?? `GP de ${countryEs(round)}`;
}

/** Bandera emoji a partir del ISO alpha-2 (decorativa; el país ya es texto). */
function flag(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((char) => char.charCodeAt(0) + 127397));
}

function posChipClass(pos: number | null): string {
  if (pos === null) return 'border-line bg-carbon-2 text-ash';
  if (pos === 1) return 'border-accent bg-accent text-ink';
  if (pos <= 3) return 'border-accent/50 bg-accent/10 text-accent-300';
  return 'border-line bg-carbon-2 text-mist';
}

/* ------------------------------ subcomponentes ---------------------------- */

function Countdown({ targetIso, label }: { targetIso: string; label: string }): ReactElement {
  const target = Date.parse(targetIso);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) {
    return <p className="text-sm text-ash">Fecha de salida no disponible.</p>;
  }

  const remaining = target - now;
  if (remaining <= 0) {
    return (
      <p className="font-display text-lg leading-snug text-accent md:text-xl">
        ¡Salida lanzada! El GP ya está en marcha.
      </p>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const blocks = [
    { value: Math.floor(totalSeconds / 86400), unit: 'días' },
    { value: Math.floor((totalSeconds % 86400) / 3600), unit: 'horas' },
    { value: Math.floor((totalSeconds % 3600) / 60), unit: 'min' },
    { value: totalSeconds % 60, unit: 'seg' },
  ];

  return (
    <div
      role="timer"
      aria-label={`Cuenta atrás para el ${label}`}
      className="grid grid-cols-4 gap-2 md:gap-3"
    >
      {blocks.map((block) => (
        <div
          key={block.unit}
          className="rounded-xl border border-line bg-carbon-2/80 px-1 py-3 text-center md:py-4"
        >
          <span className="num font-display block text-2xl text-mist md:text-4xl">
            {pad2(block.value)}
          </span>
          <span className="font-cond mt-1 block text-[0.6rem] tracking-[0.2em] text-ash uppercase">
            {block.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-line bg-carbon-2/70 px-4 py-2">
      <p className="font-cond text-[0.6rem] tracking-[0.22em] text-ash uppercase">{label}</p>
      <p className="num font-display mt-0.5 text-sm text-mist">{value}</p>
    </div>
  );
}

function GroupHeading({
  label,
  count,
  accent = false,
}: {
  label: string;
  count: number;
  accent?: boolean;
}): ReactElement {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h3
        className={`font-cond text-sm font-bold tracking-[0.3em] uppercase ${
          accent ? 'text-accent' : 'text-mist'
        }`}
      >
        {label}
      </h3>
      <span className="num rounded-full border border-line bg-carbon-2 px-2 py-0.5 text-xs text-ash">
        {count}
      </span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  );
}

function RoundCard({ round, isNext }: { round: Round; isNext: boolean }): ReactElement {
  const result = round.result;
  const racePos = result?.racePos ?? null;
  const sprintPos = result?.sprintPos ?? null;
  const win = racePos === 1;
  const podium = racePos !== null && racePos > 1 && racePos <= 3;
  const points = (result?.racePoints ?? 0) + (result?.sprintPoints ?? 0);
  const upcoming = round.status === 'upcoming';
  const live = round.status === 'live';

  return (
    <li className="h-full">
      <article
        className={`glass h-full rounded-2xl p-4 md:p-5 ${isNext ? 'glow-border border-accent/50' : ''}`}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-cond text-[0.66rem] tracking-[0.22em] text-ash uppercase">
              Ronda {pad2(round.round)} · <span aria-hidden="true">{flag(round.countryIso)}</span>{' '}
              {countryEs(round)}
            </p>
            <h4 className="font-display mt-1.5 truncate text-sm text-mist md:text-base">
              {gpLabel(round)}
            </h4>
          </div>
          <span
            aria-hidden="true"
            className="num font-display text-xl leading-none text-outline md:text-2xl"
          >
            {pad2(round.round)}
          </span>
        </header>

        <p className="mt-1.5 truncate text-xs text-ash">{round.circuit}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-cond num rounded-full border border-line bg-carbon-2 px-2.5 py-0.5 text-[0.65rem] tracking-[0.16em] text-ash uppercase">
            {upcoming ? weekendLabel(round.dateStart, round.dateEnd) : formatDayMonth(round.raceDate)}
          </span>
          {live && (
            <span className="font-cond flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.16em] text-accent uppercase">
              <span className="live-dot" aria-hidden="true" /> En vivo
            </span>
          )}
          {isNext && (
            <span className="font-cond rounded-full bg-accent px-2.5 py-0.5 text-[0.62rem] font-bold tracking-[0.18em] text-ink uppercase">
              Próxima salida
            </span>
          )}
        </div>

        {upcoming ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
            <span className="font-cond text-[0.62rem] tracking-[0.2em] text-ash uppercase">
              Salida
            </span>
            <span className="num text-xs text-mist">{formatRace(round.raceDate, false)}</span>
          </div>
        ) : (
          <div className="mt-4 border-t border-line/70 pt-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="font-cond text-[0.62rem] tracking-[0.2em] text-ash uppercase">
                Carrera
              </span>
              <span
                className={`font-display num rounded-md border px-2 py-0.5 text-xs ${posChipClass(racePos)}`}
              >
                {racePos === null ? 'DNF' : `P${racePos}`}
              </span>
              {result && !result.started && (
                <span className="font-cond text-[0.62rem] tracking-[0.16em] text-ash uppercase">
                  no salió
                </span>
              )}
              {win && (
                <span className="font-cond rounded-full border border-accent/50 bg-accent/10 px-2.5 py-0.5 text-[0.62rem] font-semibold tracking-[0.18em] text-accent uppercase">
                  Victoria
                </span>
              )}
              {podium && (
                <span className="font-cond rounded-full border border-line bg-carbon-2 px-2.5 py-0.5 text-[0.62rem] font-semibold tracking-[0.18em] text-accent-300 uppercase">
                  Podio
                </span>
              )}
              {result?.sprintStarted && (
                <>
                  <span className="font-cond text-[0.62rem] tracking-[0.2em] text-ash uppercase">
                    Sprint
                  </span>
                  <span
                    className={`font-display num rounded-md border px-2 py-0.5 text-xs ${posChipClass(sprintPos)}`}
                  >
                    {sprintPos === null ? 'DNF' : `P${sprintPos}`}
                  </span>
                </>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <span className="font-cond text-[0.62rem] tracking-[0.2em] text-ash uppercase">
                Puntos del GP
              </span>
              <span className="num font-display text-sm text-accent">+{points}</span>
            </div>
          </div>
        )}
      </article>
    </li>
  );
}

/* --------------------------------- sección -------------------------------- */

export default function Calendar(): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  const { season, status, source, lastUpdated, isLive, refresh } = useLiveData();

  const rounds = season?.rounds ?? [];
  const year = season?.season ?? 2026;
  const nextRace = season?.nextRace ?? null;
  const bezzecchi = season?.bezzecchi ?? null;
  const nextRound = nextRace?.round ?? null;

  const finishedRounds = rounds.filter((round) => round.status === 'finished');
  const liveRounds = rounds.filter((round) => round.status === 'live');
  const upcomingRounds = rounds.filter((round) => round.status === 'upcoming');

  const loading = status === 'loading';
  const revealKey = season ? `${status}:${rounds.length}` : status;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const root = rootRef.current;
      if (!root) return;

      // Entrada coherente con el "recorrido": cada tramo (cabecera, panel de
      // cuenta atrás, grupo de rondas) se pasa de largo y frena; dentro de los
      // grupos, las tarjetas entran en cascada como curvas consecutivas.
      const panels = gsap.utils.toArray<HTMLElement>('[data-cal-reveal]', root);
      panels.forEach((panel) => {
        gsap.from(panel, {
          opacity: 0,
          y: 40,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: panel, start: 'top 92%', once: true },
        });

        const cards = panel.querySelectorAll<HTMLElement>('ul > li');
        if (cards.length > 1) {
          gsap.from(cards, {
            opacity: 0,
            y: 32,
            duration: 0.65,
            ease: 'power3.out',
            stagger: 0.07,
            scrollTrigger: { trigger: panel, start: 'top 88%', once: true },
          });
        }
      });
    }, rootRef);

    return () => ctx.revert();
  }, [revealKey]);

  return (
    <section id="calendario" className="section scroll-mt-24" aria-labelledby="calendario-title">
      <div className="container-x">
        <div data-cal-reveal className="max-w-3xl">
          <p className="eyebrow">
            Temporada {year} · {rounds.length > 0 ? `${rounds.length} rondas` : 'cargando calendario'}
          </p>
          <h2 id="calendario-title" className="mt-3 text-3xl text-mist md:text-5xl">
            Calendario <span className="accent-gradient">{year}</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ash md:text-base">
            Cuenta atrás en vivo para la próxima cita y resultado de cada ronda disputada por
            Bezzecchi: posición, sprint y puntos sumados.
          </p>

          {season && (
            <div className="mt-6 flex flex-wrap gap-3">
              <StatChip
                label="Disputadas"
                value={`${finishedRounds.length + liveRounds.length}/${rounds.length}`}
              />
              <StatChip label="Próximas" value={String(upcomingRounds.length)} />
              <StatChip
                label="Bezzecchi"
                value={bezzecchi ? `P${bezzecchi.position} · ${bezzecchi.points} pts` : '—'}
              />
            </div>
          )}

          {loading && (
            <div className="mt-6 flex flex-wrap gap-3" aria-hidden="true">
              <div className="skeleton h-14 w-32 rounded-xl" />
              <div className="skeleton h-14 w-32 rounded-xl" />
              <div className="skeleton h-14 w-32 rounded-xl" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            {source && source !== 'live' && lastUpdated && (
              <p className="text-xs text-ash">
                {source === 'cache' ? 'Datos en caché local' : 'Snapshot sin conexión'} ·
                actualizados {formatLastUpdate(lastUpdated)}
              </p>
            )}
            {source && (
              <button
                type="button"
                onClick={refresh}
                className="font-cond rounded-full border border-line px-3 py-1 text-[0.65rem] tracking-[0.18em] text-ash uppercase transition-colors hover:border-accent/60 hover:text-accent"
              >
                Actualizar
              </button>
            )}
          </div>

          <p className="mt-2 text-xs text-ash">
            Horas mostradas en zona local: {LOCAL_TZ}.
          </p>
        </div>

        {/* ------------------------------ cargando ------------------------------ */}
        {loading && (
          <div role="status" aria-busy="true" className="mt-8">
            <span className="sr-only">Cargando el calendario de la temporada…</span>
            <div className="skeleton h-56 rounded-3xl" aria-hidden="true" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="skeleton h-44 rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {/* -------------------------------- error -------------------------------- */}
        {!loading && !season && (
          <div className="glass mt-8 rounded-3xl p-8 text-center">
            <p className="font-cond text-xs tracking-[0.25em] text-ash uppercase">
              Sin conexión con la API de MotoGP
            </p>
            <p className="mt-3 text-sm text-ash">
              No se pudo cargar el calendario. Inténtalo de nuevo en unos segundos.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="font-cond mt-5 rounded-full border border-accent/60 px-5 py-2 text-xs tracking-[0.2em] text-accent uppercase transition-colors hover:bg-accent hover:text-ink"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ------------------------- próxima carrera (cuenta atrás) ---------------- */}
        {season && nextRace && (
          <div
            data-cal-reveal
            className="glass glow-border relative mt-8 overflow-hidden rounded-3xl p-6 md:p-9"
          >
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow">Próxima carrera</p>
                  {isLive && (
                    <span className="font-cond flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.2em] text-accent uppercase">
                      <span className="live-dot" aria-hidden="true" />
                      Fin de semana en curso
                    </span>
                  )}
                </div>

                <p className="font-cond mt-4 text-xs tracking-[0.26em] text-ash uppercase">
                  Ronda {pad2(nextRace.round)} · {nextRace.shortName} ·{' '}
                  <span aria-hidden="true">{flag(nextRace.countryIso)}</span> {countryEs(nextRace)}
                </p>
                <h3 className="mt-2 text-3xl text-mist md:text-5xl">{gpLabel(nextRace)}</h3>
                <p className="mt-3 text-sm text-ash md:text-base">{nextRace.circuit}</p>

                <dl className="mt-6 grid max-w-md grid-cols-2 gap-4">
                  <div>
                    <dt className="font-cond text-[0.65rem] tracking-[0.22em] text-ash uppercase">
                      Fin de semana
                    </dt>
                    <dd className="num mt-1 text-sm text-mist">
                      {weekendLabel(nextRace.dateStart, nextRace.dateEnd)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-cond text-[0.65rem] tracking-[0.22em] text-ash uppercase">
                      Salida
                    </dt>
                    <dd className="num mt-1 text-sm text-mist">
                      {formatRace(nextRace.raceDate, true)}
                      <span className="block text-xs text-ash">hora local</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="md:pl-4">
                <p className="eyebrow">Cuenta atrás</p>
                <div className="mt-4">
                  <Countdown targetIso={nextRace.raceDate} label={gpLabel(nextRace)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------- temporada terminada -------------------------- */}
        {season && !nextRace && rounds.length > 0 && (
          <div
            data-cal-reveal
            className="glass glow-border mt-8 rounded-3xl p-8 text-center md:p-10"
          >
            <p className="eyebrow">Temporada completada</p>
            <h3 className="mt-4 text-2xl text-mist md:text-4xl">
              Fin de temporada <span className="accent-gradient">{year}</span>
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ash md:text-base">
              Se han disputado las {rounds.length} rondas del calendario.
              {bezzecchi &&
                ` ${bezzecchi.name} cierra en P${bezzecchi.position} con ${bezzecchi.points} puntos y ${bezzecchi.raceWins} victorias.`}
            </p>
            <p className="font-cond mt-4 text-xs tracking-[0.2em] text-ash uppercase">
              Próxima cita: nueva temporada
            </p>
          </div>
        )}

        {/* ------------------------------- rondas -------------------------------- */}
        {season && rounds.length > 0 && (
          <div className="mt-10">
            {liveRounds.length > 0 && (
              <div data-cal-reveal>
                <GroupHeading label="En curso" count={liveRounds.length} accent />
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {liveRounds.map((round) => (
                    <RoundCard
                      key={round.round}
                      round={round}
                      isNext={round.round === nextRound}
                    />
                  ))}
                </ul>
              </div>
            )}

            {finishedRounds.length > 0 && (
              <div data-cal-reveal>
                <GroupHeading label="Disputadas" count={finishedRounds.length} />
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {finishedRounds.map((round) => (
                    <RoundCard
                      key={round.round}
                      round={round}
                      isNext={round.round === nextRound}
                    />
                  ))}
                </ul>
              </div>
            )}

            {upcomingRounds.length > 0 && (
              <div data-cal-reveal>
                <GroupHeading label="Próximas" count={upcomingRounds.length} accent />
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {upcomingRounds.map((round) => (
                    <RoundCard
                      key={round.round}
                      round={round}
                      isNext={round.round === nextRound}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
