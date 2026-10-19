/**
 * LiveScoreboard — sección #marcador (ancla de navegación).
 *
 * Bebe del polling compartido `useLiveData()` (sin fetch propios, sin
 * setInterval, sin localStorage): cabecera con badge EN VIVO, posición y
 * puntos con odómetro de dígitos rodantes, destello + badge «+N» cuando
 * cambian los puntos, KPIs de temporada, mini-clasificación Top 5 y estados
 * de carga / caché / error. Todo en español y con `prefers-reduced-motion`.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BEZZECCHI_NUMBER,
  SEASON_YEAR,
  formatLastUpdate,
  getBezzecchi,
  useLiveData,
} from '../data/api';
import type { RiderStanding, SeasonData, StandingsData } from '../data/api';
import { TiltCard } from './TiltCard';

/* ------------------------------- helpers --------------------------------- */

function lastName(fullName: string): string {
  return fullName.trim().split(/\s+/).at(-1) ?? fullName;
}

/** ISO-2 → emoji de bandera; si no es ISO-2, se muestra el código tal cual. */
function flagGlyph(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return code || '—';
  const [first, second] = code;
  return String.fromCodePoint(first.charCodeAt(0) + 127397, second.charCodeAt(0) + 127397);
}

const BADGE_CLS =
  'num inline-flex shrink-0 items-center rounded-full bg-accent px-2.5 py-0.5 font-cond text-[11px] font-bold tracking-[0.08em] uppercase text-ink';

/* ------------------------------- odómetro -------------------------------- */

function RollingDigit({ char, reduced }: { char: string; reduced: boolean }): ReactElement {
  if (reduced) {
    return <span className="inline-block">{char}</span>;
  }
  return (
    <span
      className="relative inline-block overflow-hidden"
      style={{ height: '1.1em', lineHeight: 1 }}
    >
      {/* Reserva de ancho (tabular-nums → todos los dígitos miden lo mismo) */}
      <span className="invisible" aria-hidden="true">
        0
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={char}
          initial={{ y: '115%' }}
          animate={{ y: '0%' }}
          exit={{ y: '-115%' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Dígitos rodantes (3 o 4 dígitos funcionan igual). El número se anuncia por sr-only. */
function Odometer({ value, className }: { value: number; className?: string }): ReactElement {
  const reduced = useReducedMotion() === true;
  const chars = String(value).split('');

  return (
    <span className={`num inline-flex ${className ?? ''}`} aria-hidden="true">
      {chars.map((char, index) => (
        <RollingDigit key={index} char={char} reduced={reduced} />
      ))}
    </span>
  );
}

/* ------------------------------- estados --------------------------------- */

function ScoreboardSkeleton(): ReactElement {
  return (
    <div className="mt-8" role="status" aria-live="polite">
      <span className="sr-only">Cargando el marcador del Mundial…</span>

      <div className="glass glow-border rounded-2xl p-6 md:p-8">
        <div className="skeleton h-4 w-44" aria-hidden="true" />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6" aria-hidden="true">
          <div className="skeleton h-16 w-32" />
          <div className="skeleton h-16 w-48" />
        </div>
        <div className="skeleton mt-6 h-4 w-64" aria-hidden="true" />
      </div>

      <div
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-28" />
        ))}
      </div>

      <div className="skeleton mt-6 h-72 w-full" aria-hidden="true" />
    </div>
  );
}

function ErrorPanel({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string | null;
  onRetry: () => void;
}): ReactElement {
  return (
    <div className="glass glow-border mt-8 rounded-2xl p-8 text-center" role="alert">
      <p className="font-cond text-xs tracking-[0.3em] text-accent uppercase">
        Marcador no disponible
      </p>
      <p className="mt-3 text-sm text-mist">{title}</p>
      {detail !== null && detail !== '' ? (
        <p className="mt-1 break-words text-xs text-ash">{detail}</p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="font-cond mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-semibold tracking-[0.2em] uppercase text-ink transition-colors hover:bg-accent-300"
      >
        Reintentar
      </button>
    </div>
  );
}

/* --------------------------------- KPIs ---------------------------------- */

interface Kpi {
  id: string;
  label: string;
  value: number | string;
  suffix?: string;
  note: string;
  highlight?: boolean;
  span?: boolean;
}

function KpiCard({ kpi }: { kpi: Kpi }): ReactElement {
  return (
    <TiltCard
      label={kpi.label}
      intensity={6}
      className={`p-5 ${kpi.span ? 'lg:col-span-2' : ''} ${kpi.highlight ? 'border-accent/40' : ''}`}
    >
      <p
        className={`num font-display text-3xl leading-none md:text-4xl ${
          kpi.highlight ? 'text-accent' : 'text-mist'
        }`}
      >
        {kpi.value}
        {kpi.suffix !== undefined ? (
          <span className="font-cond ml-1.5 text-sm tracking-[0.15em] text-ash uppercase">
            {kpi.suffix}
          </span>
        ) : null}
      </p>
      <p className="font-cond mt-2 text-xs tracking-[0.14em] text-ash uppercase">{kpi.note}</p>
    </TiltCard>
  );
}

/* --------------------------- mini-clasificación --------------------------- */

function StandingsPanel({ riders }: { riders: RiderStanding[] }): ReactElement {
  return (
    <section
      className="glass glow-border rounded-2xl p-5 md:p-6"
      aria-labelledby="marcador-top5-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="marcador-top5-title"
          className="font-cond text-sm font-semibold tracking-[0.25em] text-mist uppercase"
        >
          Clasificación · Top 5
        </h3>
        <span className="font-cond num text-xs tracking-[0.2em] text-ash uppercase">
          Temporada {SEASON_YEAR}
        </span>
      </div>

      <ol className="mt-4 divide-y divide-line/70">
        {riders.map((rider) => {
          const isBezzecchi = rider.number === BEZZECCHI_NUMBER;
          return (
            <li
              key={rider.number}
              className={`grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 ${
                isBezzecchi ? 'border-accent bg-accent/10' : 'border-transparent'
              }`}
            >
              <span className="font-display num text-sm text-ash">P{rider.position}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-sm leading-none">
                    {flagGlyph(rider.countryIso)}
                  </span>
                  <span
                    className={`truncate text-sm ${
                      isBezzecchi ? 'font-semibold text-accent' : 'text-mist'
                    }`}
                  >
                    {rider.name}
                  </span>
                  <span className="sr-only">{rider.country}</span>
                </span>
                <span className="font-cond hidden truncate text-[11px] tracking-[0.12em] text-ash uppercase sm:block">
                  {rider.team}
                </span>
              </span>
              <span className="text-right">
                <span className="font-display num text-sm text-mist">{rider.points}</span>
                <span className="font-cond ml-1 text-[11px] tracking-[0.1em] text-ash uppercase">
                  pts
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------ contenido -------------------------------- */

function ReadyBoard({
  standings,
  season,
  bezzecchi,
}: {
  standings: StandingsData;
  season: SeasonData;
  bezzecchi: RiderStanding;
}): ReactElement {
  const reducedMotion = useReducedMotion() === true;

  const leader =
    season.leader ?? standings.riders[0] ?? null;
  const gap = leader !== null ? Math.max(leader.points - bezzecchi.points, 0) : null;

  /* Destello + badge «+N»: se comparan con el valor anterior vía useRef. */
  const points = bezzecchi.points;
  const previousPointsRef = useRef<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const previous = previousPointsRef.current;
    previousPointsRef.current = points;
    if (previous === null || previous === points) return undefined;

    const diff = points - previous;
    setDelta(diff);
    const timer = window.setTimeout(() => setDelta(null), 2600);
    return () => window.clearTimeout(timer);
  }, [points]);

  const deltaText =
    delta === null ? '' : delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`;

  const flash =
    delta !== null && !reducedMotion ? (
      <motion.span
        key={`flash-${points}`}
        aria-hidden="true"
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-accent"
      />
    ) : null;

  const deltaBadge =
    delta === null ? null : reducedMotion ? (
      <span className={BADGE_CLS}>{deltaText}</span>
    ) : (
      <AnimatePresence mode="wait">
        <motion.span
          key={`delta-${points}`}
          className={BADGE_CLS}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {deltaText}
        </motion.span>
      </AnimatePresence>
    );

  const change = bezzecchi.positionChange;
  const positionChip =
    change === 0 ? null : (
      <span
        aria-hidden="true"
        className={`font-cond num inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs tracking-[0.15em] uppercase ${
          change > 0 ? 'border-accent/50 text-accent-300' : 'border-line text-ash'
        }`}
      >
        {change > 0 ? '▲' : '▼'} {Math.abs(change)}
      </span>
    );
  const positionSr =
    change === 0
      ? null
      : `${change > 0 ? 'Sube' : 'Baja'} ${Math.abs(change)} ${
          Math.abs(change) === 1 ? 'posición' : 'posiciones'
        } en la clasificación.`;

  const gapLabel =
    leader === null
      ? { value: '—', suffix: undefined, note: 'Sin datos del líder' }
      : leader.number === bezzecchi.number
        ? { value: 'Líder', suffix: undefined, note: 'Del Mundial' }
        : {
            value: `−${gap ?? leader.points - bezzecchi.points}`,
            suffix: 'pts',
            note: `a ${lastName(leader.name)}`,
          };

  const kpis: Kpi[] = [
    { id: 'wins', label: 'Victorias', value: bezzecchi.raceWins, note: 'Grandes Premios ganados' },
    { id: 'podiums', label: 'Podios', value: bezzecchi.podiums, note: 'Podios en carrera' },
    { id: 'poles', label: 'Poles', value: season.stats.poles, note: 'Salidas en primera fila' },
    {
      id: 'fastest-laps',
      label: 'Vueltas rápidas',
      value: season.stats.fastestLaps,
      note: 'Mejor vuelta por vuelta',
    },
    {
      id: 'sprint-podiums',
      label: 'Podios de Sprint',
      value: bezzecchi.sprintPodiums,
      note: 'Top 3 del Sprint',
    },
    {
      id: 'gap',
      label: 'Distancia al líder',
      value: gapLabel.value,
      suffix: gapLabel.suffix,
      note: gapLabel.note,
      highlight: true,
      span: true,
    },
  ];

  const topRiders = standings.riders.slice(0, 5);
  const rows: RiderStanding[] = topRiders.some(
    (rider) => rider.number === bezzecchi.number,
  )
    ? topRiders
    : [...topRiders, bezzecchi];

  return (
    <div className="mt-8 space-y-6">
      {/* Posición + puntos con odómetro */}
      <TiltCard className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-cond text-sm font-semibold tracking-[0.22em] text-ash uppercase">
            <span className="text-mist">Marco Bezzecchi</span> · #{BEZZECCHI_NUMBER} ·{' '}
            {bezzecchi.team}
          </p>
          <span className="flex items-center gap-2">
            {positionChip}
            {positionSr !== null ? <span className="sr-only">{positionSr}</span> : null}
          </span>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 sm:items-end">
          <div>
            <p className="font-cond text-xs tracking-[0.3em] text-ash uppercase">Posición</p>
            <p className="mt-2 flex items-center font-display text-5xl leading-none md:text-7xl">
              <span aria-hidden="true" className="mr-1 text-accent">
                P
              </span>
              <Odometer value={bezzecchi.position} className="text-mist" />
              <span className="sr-only">Posición actual: {bezzecchi.position}º</span>
            </p>
          </div>

          <div className="relative sm:text-right">
            <div className="flex items-center justify-between gap-2">
              <p className="font-cond text-xs tracking-[0.3em] text-ash uppercase">Puntos</p>
              {deltaBadge}
            </div>
            <p className="relative mt-2 flex items-center font-display text-5xl leading-none md:text-7xl sm:justify-end">
              {flash}
              <Odometer value={points} className="text-mist" />
              <span className="font-cond ml-2 text-base tracking-[0.2em] text-ash uppercase">
                pts
              </span>
              <span className="sr-only">{points} puntos</span>
            </p>
          </div>
        </div>
      </TiltCard>

      {/* KPIs de temporada */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Mini-clasificación */}
      <StandingsPanel riders={rows} />

      <p className="sr-only" role="status">
        {delta !== null
          ? `Puntos actualizados: ${delta > 0 ? '+' : ''}${delta}. Total: ${points} puntos.`
          : ''}
      </p>
    </div>
  );
}

/* -------------------------------- sección -------------------------------- */

export default function LiveScoreboard(): ReactElement {
  const { standings, season, status, error, source, lastUpdated, raceWeekend, refresh } =
    useLiveData();
  const reducedMotion = useReducedMotion() === true;
  const bezzecchi = getBezzecchi(standings);

  let content: ReactElement;
  if (status === 'loading' && !standings) {
    content = <ScoreboardSkeleton />;
  } else if (!standings || !season || !bezzecchi) {
    const title = !standings || !season
      ? 'No hay datos de clasificación disponibles ahora mismo.'
      : 'Marco Bezzecchi (#72) no aparece en la clasificación recibida.';
    content = <ErrorPanel title={title} detail={error} onRetry={refresh} />;
  } else {
    content = <ReadyBoard standings={standings} season={season} bezzecchi={bezzecchi} />;
  }

  const isLive = raceWeekend.active;
  const stale = source === 'cache' || source === 'mock';

  return (
    <section id="marcador" className="section scroll-mt-24" aria-labelledby="marcador-title">
      <div className="container-x">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Tiempo real</p>
              <h2 id="marcador-title" className="mt-3 text-3xl text-mist md:text-5xl">
                Puntos del Mundial <span className="num text-accent">{SEASON_YEAR}</span>
              </h2>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              {isLive ? (
                <span className="font-cond inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
                  <span className="live-dot" aria-hidden="true" />
                  {raceWeekend.name ? `En vivo · ${raceWeekend.name}` : 'En vivo'}
                </span>
              ) : (
                <span className="font-cond inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs tracking-[0.2em] text-ash uppercase">
                  Última carrera disputada
                </span>
              )}
              <span className="font-cond num text-xs tracking-[0.15em] text-ash uppercase">
                Actualizado {formatLastUpdate(lastUpdated)}
              </span>
            </div>
          </header>

          {stale ? (
            <p
              className="mt-5 flex items-start gap-2 rounded-lg border border-line/70 bg-carbon-2/70 px-3.5 py-2.5 text-xs text-ash"
              role="status"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span>
                <span className="font-cond tracking-[0.18em] text-mist uppercase">
                  {source === 'cache' ? 'Datos en caché' : 'Modo sin conexión · snapshot local'}
                </span>
                {error ? <span className="block break-words text-ash">{error}</span> : null}
              </span>
            </p>
          ) : null}

          {content}
        </motion.div>
      </div>
    </section>
  );
}
