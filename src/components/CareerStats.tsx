import { useEffect, useRef, useState, type ReactElement } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { CAREER_STATS } from '../data/content';
import { formatLastUpdate, getBezzecchi, useLiveData } from '../data/api';
import type { DataSource } from '../data/api';
import { TiltCard } from './TiltCard';
import { StatsCharts } from './StatsCharts';

/* --------------------------------------------------------------------------
 * 4 · Estadísticas de carrera (#estadisticas) — acabado HUD del circuito.
 * - Tarjetas TiltCard con índice "01/06", cifras `.num` en Orbitron y
 *   contadores que animan al entrar en pantalla (finales sin animación con
 *   reduced motion y anunciados por sr-only).
 * - Gráfica de evolución de puntos (Recharts) con riel de datos vivo:
 *   procedencia + hora de actualización, o esqueleto de carga.
 * - Sección propia en diferido desde App.tsx: Recharts queda fuera del bundle
 *   principal y solo se descarga al llegar hasta aquí.
 * ------------------------------------------------------------------------ */

/** Chip de procedencia: color Y texto distintos por fuente (nunca solo color). */
const SOURCE_CHIP: Record<DataSource, { text: string; cls: string; dot: string }> = {
  live: {
    text: 'En directo',
    cls: 'border-accent/50 bg-accent/10 text-accent',
    dot: 'bg-accent',
  },
  cache: {
    text: 'Caché local',
    cls: 'border-line bg-carbon-2 text-mist',
    dot: 'bg-ash',
  },
  mock: {
    text: 'Snapshot offline',
    cls: 'border-accent-300/50 bg-accent-300/10 text-accent-300',
    dot: 'bg-accent-300',
  },
};

/** Contador animado que se dispara al entrar en pantalla (respeta reduced motion). */
function Counter({ value, suffix }: { value: number; suffix?: string }): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-12%' });
  const reduced = useReducedMotion() ?? false;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduced) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration: 1.3,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <>
      {/* La cifra rodante es decorativa para lectores de pantalla */}
      <span ref={ref} aria-hidden="true" className="num">
        {display}
        {suffix}
      </span>
      <span className="sr-only">
        {value}
        {suffix}
      </span>
    </>
  );
}

export default function CareerStats(): ReactElement {
  const { standings, season, status, source, lastUpdated } = useLiveData();
  const bezzecchi = getBezzecchi(standings);
  const evolution = season?.evolution ?? [];
  const leaderName = season?.leader?.name ?? standings?.riders[0]?.name;
  const sourceMeta = source !== null ? SOURCE_CHIP[source] : null;
  const chartLoading = status === 'loading' && evolution.length === 0;

  return (
    <section id="estadisticas" className="section scroll-mt-24" aria-labelledby="estadisticas-title">
      <div className="container-x">
        <p className="eyebrow">Cifras</p>
        <h2 id="estadisticas-title" className="mt-3 text-3xl text-mist md:text-5xl">
          Estadísticas de carrera
        </h2>

        <div className="mt-8">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <p className="max-w-2xl text-ash">
              Totales de su carrera desde 2015 (Moto3, Moto2 y MotoGP) y evolución de sus puntos en
              la temporada {season?.season ?? 2026}.
            </p>

            {/* Riel HUD: procedencia y hora de los datos que alimentan la gráfica */}
            <div className="flex flex-wrap items-center gap-2">
              {sourceMeta !== null ? (
                <span
                  className={`font-cond inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] tracking-[0.18em] uppercase ${sourceMeta.cls}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${sourceMeta.dot}`}
                  />
                  {sourceMeta.text}
                </span>
              ) : null}
              <span
                aria-live="polite"
                className="font-cond text-[11px] tracking-[0.15em] text-ash uppercase"
              >
                Actualizado <span className="num text-mist">{formatLastUpdate(lastUpdated)}</span>
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAREER_STATS.map((stat, index) => (
              <TiltCard key={stat.id} label={stat.label} className="p-6" intensity={8}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display accent-gradient text-5xl font-black md:text-6xl">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <span className="font-cond num shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] tracking-[0.15em] text-ash uppercase">
                    {String(index + 1).padStart(2, '0')}/
                    {String(CAREER_STATS.length).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-3 border-t border-line/70 pt-3 text-xs text-ash">{stat.note}</p>
              </TiltCard>
            ))}
          </div>

          <div className="glass mt-10 rounded-2xl p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line/70 pb-3">
              <h3 className="font-display text-lg text-mist">Evolución de puntos</h3>
              <p className="font-cond text-xs tracking-[0.2em] text-ash uppercase">
                <span className="num text-mist">{bezzecchi?.name ?? 'Bezzecchi'}</span> vs{' '}
                {leaderName ?? 'líder'}
              </p>
            </div>

            {chartLoading ? (
              <div role="status" aria-live="polite">
                <span className="sr-only">Cargando la gráfica de evolución de puntos…</span>
                <div className="skeleton h-[19rem] w-full" aria-hidden="true" />
              </div>
            ) : (
              <StatsCharts
                evolution={evolution}
                bezzecchiName={bezzecchi?.name}
                leaderName={leaderName}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
