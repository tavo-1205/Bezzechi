import { useEffect, useRef, type ReactElement } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TIMELINE, type TimelineEntry } from '../data/content';

/**
 * Trayectoria de Marco Bezzecchi (#72).
 *
 * - El contenido NO se duplica aquí: se lee de `src/data/content` (TIMELINE),
 *   el único proveedor de copy del sitio.
 * - Línea vertical con marcadores por era; cada hito entra con ScrollTrigger
 *   dentro de un `gsap.context` que se revierte al desmontar.
 * - Con `prefers-reduced-motion` no se crea ninguna animación: todo se muestra
 *   visible y sin transformaciones (el estado por defecto del DOM).
 */

const ERA_STYLE: Record<TimelineEntry['era'], { chip: string; dot: string }> = {
  Moto3: { chip: 'border-line text-ash', dot: 'bg-ash' },
  Moto2: { chip: 'border-mist/40 text-mist', dot: 'bg-mist' },
  MotoGP: { chip: 'border-accent/60 text-accent', dot: 'bg-accent' },
};

export default function Timeline(): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const root = rootRef.current;
      if (!root) return;

      // Progreso de la línea vertical (ligado al scroll).
      const progress = root.querySelector<HTMLElement>('[data-tl-progress]');
      if (progress) {
        gsap.fromTo(
          progress,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: root, start: 'top 75%', end: 'bottom 75%', scrub: 0.6 },
          },
        );
      }

      // Entrada de cada hito: opacidad + desplazamiento, con el punto escalando.
      const items = gsap.utils.toArray<HTMLElement>('[data-tl-item]', root);
      items.forEach((item) => {
        const reveal = gsap.timeline({
          scrollTrigger: { trigger: item, start: 'top 85%', once: true },
        });
        reveal.from(item, { opacity: 0, y: 48, duration: 0.8, ease: 'power3.out' }, 0);
        const marker = item.querySelector<HTMLElement>('[data-tl-marker]');
        if (marker) reveal.from(marker, { scale: 0, duration: 0.45, ease: 'back.out(2)' }, 0.12);
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="trayectoria" className="section scroll-mt-24" aria-labelledby="trayectoria-title">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow">Biografía · Trayectoria</p>
          <h2 id="trayectoria-title" className="mt-3 text-3xl text-mist md:text-5xl">
            De Moto3 a la <span className="accent-gradient">élite</span> con Aprilia
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ash md:text-base">
            Siete hitos verificados entre 2015 y 2026: del debut en Moto3 a la RS-GP26 de Aprilia Racing.
          </p>
        </div>

        <div ref={rootRef} className="relative mt-10 md:mt-14">
          {/* Línea vertical (decorativa) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 w-px bg-line md:left-6"
          >
            <div data-tl-progress className="absolute inset-x-0 top-0 h-full origin-top bg-accent" />
          </div>

          <ol aria-label="Hitos de la trayectoria de Marco Bezzecchi" className="list-none space-y-8 md:space-y-12">
            {TIMELINE.map((entry) => {
              const era = ERA_STYLE[entry.era];
              const current = entry.current === true;

              return (
                <li key={entry.id} data-tl-item className="relative pl-9 md:pl-14">
                  <span
                    data-tl-marker
                    aria-hidden="true"
                    className={`absolute left-2 top-6 h-4 w-4 rounded-full border-2 bg-ink md:left-4 md:top-8 ${
                      current ? 'border-accent shadow-[0_0_16px_rgba(255,77,0,0.6)]' : 'border-line'
                    }`}
                  >
                    <span className={`absolute inset-0.5 rounded-full ${era.dot}`} />
                  </span>

                  <article
                    className={`glass rounded-2xl p-5 md:p-7 ${current ? 'glow-border' : ''}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span
                        className={`font-cond rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${era.chip}`}
                      >
                        {entry.era}
                      </span>
                      <span className="num font-cond text-xs tracking-[0.24em] text-ash uppercase">
                        {entry.period}
                      </span>
                      {current && (
                        <span className="font-cond rounded-full bg-accent px-3 py-0.5 text-[0.65rem] font-bold tracking-[0.2em] text-ink uppercase">
                          Actualidad
                        </span>
                      )}
                    </div>

                    <p className="font-cond mt-4 text-sm tracking-[0.18em] text-ash uppercase">
                      {entry.team}
                    </p>
                    <h3
                      className={`font-display mt-2 text-xl md:text-2xl ${
                        current ? 'accent-gradient' : 'text-mist'
                      }`}
                    >
                      {entry.title}
                    </h3>

                    <div className={`mt-5 ${entry.image ? 'md:grid md:grid-cols-2 md:gap-6' : ''}`}>
                      <div>
                        <p className="text-sm leading-relaxed text-ash md:text-base">
                          {entry.description}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                          <div
                            className={`rounded-xl border px-4 py-3 ${
                              current ? 'border-accent/50 bg-accent/10' : 'border-line bg-carbon-2'
                            }`}
                          >
                            <p className="num font-display text-2xl text-accent md:text-3xl">
                              {entry.stat.value}
                            </p>
                            <p className="font-cond mt-0.5 text-[0.62rem] tracking-[0.2em] text-ash uppercase">
                              {entry.stat.label}
                            </p>
                          </div>

                          <ul className="flex flex-wrap gap-2">
                            {entry.highlights.map((highlight) => (
                              <li
                                key={highlight}
                                className="font-cond rounded-full border border-line bg-carbon px-3 py-1 text-xs tracking-[0.12em] text-mist uppercase"
                              >
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {entry.image && (
                        <figure className="mt-5 md:mt-0">
                          <img
                            src={entry.image}
                            alt={entry.imageAlt ?? entry.title}
                            loading="lazy"
                            decoding="async"
                            className="h-52 w-full rounded-xl border border-line object-cover md:h-64"
                          />
                          {entry.credit && (
                            <figcaption className="mt-2 text-xs leading-relaxed text-ash">
                              {entry.credit}
                            </figcaption>
                          )}
                        </figure>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
