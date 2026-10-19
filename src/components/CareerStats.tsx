import { useEffect, useRef, useState, type ReactElement } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { CAREER_STATS } from '../data/content';
import { getBezzecchi, useLiveData } from '../data/api';
import { TiltCard } from './TiltCard';
import { StatsCharts } from './StatsCharts';

/* --------------------------------------------------------------------------
 * 4 · Estadísticas de carrera (#estadisticas).
 * - Tarjetas TiltCard con contadores que animan al entrar en pantalla.
 * - Gráfica de evolución de puntos (Recharts) compartiendo el store vivo.
 * - Sección propia en diferido desde App.tsx: Recharts queda fuera del bundle
 *   principal y solo se descarga al llegar hasta aquí.
 * ------------------------------------------------------------------------ */

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
    <span ref={ref} className="num">
      {display}
      {suffix}
    </span>
  );
}

export default function CareerStats(): ReactElement {
  const { standings, season } = useLiveData();
  const bezzecchi = getBezzecchi(standings);
  const evolution = season?.evolution ?? [];
  const leaderName = season?.leader?.name ?? standings?.riders[0]?.name;

  return (
    <section id="estadisticas" className="section scroll-mt-24" aria-labelledby="estadisticas-title">
      <div className="container-x">
        <p className="eyebrow">Cifras</p>
        <h2 id="estadisticas-title" className="mt-3 text-3xl text-mist md:text-5xl">
          Estadísticas de carrera
        </h2>

        <div className="mt-8">
          <p className="max-w-2xl text-ash">
            Totales de su carrera desde 2015 (Moto3, Moto2 y MotoGP) y evolución de sus puntos en
            la temporada {season?.season ?? 2026}.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAREER_STATS.map((stat) => (
              <TiltCard key={stat.id} label={stat.label} className="p-6" intensity={8}>
                <p className="font-display accent-gradient text-5xl font-black md:text-6xl">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-xs text-ash">{stat.note}</p>
              </TiltCard>
            ))}
          </div>

          <div className="glass mt-10 rounded-2xl p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg text-mist">Evolución de puntos</h3>
              <p className="font-cond text-xs tracking-[0.2em] text-ash uppercase">
                {bezzecchi?.name ?? 'Bezzecchi'} vs {leaderName ?? 'líder'}
              </p>
            </div>
            <StatsCharts
              evolution={evolution}
              bezzecchiName={bezzecchi?.name}
              leaderName={leaderName}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
