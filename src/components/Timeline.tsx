import { useEffect, useRef, useState, type ReactElement } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TIMELINE, type TimelineEntry } from '../data/content';

/**
 * Trayectoria de Marco Bezzecchi (#72) — tramo "curvas del circuito".
 *
 * - El contenido NO se duplica aquí: se lee de `src/data/content` (TIMELINE).
 * - PIN + SCRUB: la sección queda anclada (pinned) mientras un wrapper interno
 *   se traslada con el scroll (recorrido vertical de la era). El progreso del
 *   pin dibuja la línea de acento y hace avanzar la MOTO por la línea.
 * - La línea/moto viven dentro del wrapper trasladado: la moto pasa por cada
 *   marcador de era en el mismo instante en que su tarjeta es visible.
 * - Each hito enters with a reveal tied to the SAME container animation
 *   (`containerAnimation`), así las entradas quedan sincronizadas con el
 *   recorrido y no dependen de medidas refrescadas a mano.
 * - Optimización: `invalidateOnRefresh` + fin function-based (recalcula en
 *   resize/fuentes; App.tsx ya lanza `ScrollTrigger.refresh()`), y
 *   `will-change` SOLO mientras el pin está activo (`onToggle`).
 * - Con `prefers-reduced-motion` no se pincha nada: sin pin, sin scrub, todo
 *   visible y estático (estado por defecto del DOM).
 */

const ERA_STYLE: Record<TimelineEntry['era'], { chip: string; dot: string }> = {
  Moto3: { chip: 'border-line text-ash', dot: 'bg-ash' },
  Moto2: { chip: 'border-mist/40 text-mist', dot: 'bg-mist' },
  MotoGP: { chip: 'border-accent/60 text-accent', dot: 'bg-accent' },
};

export default function Timeline(): ReactElement {
  // Scope de TODAS las queries del efecto (QA-08): la sección, no el documento.
  const sectionRef = useRef<HTMLElement>(null);
  // Pin/scrub: ventana acotada que se "pincha".
  const rootRef = useRef<HTMLDivElement>(null);
  // `reduced` decide el markup (sin pin/overflow si el usuario lo pide).
  const [reduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (reduced) return undefined;

    gsap.registerPlugin(ScrollTrigger);

    // QA-08: queries acotadas por ref (nunca `document.querySelector`).
    // - `root` (pin viewport): track/línea/moto/hitos/figcaption.
    // - `section` (árbol completo del tramo): el bloque `data-tl-head`, que vive
    //   FUERA del pin viewport (la cabecera debe alejarse antes del anclado);
    //   un `root.querySelector` la perdería (null) por diseño del layout.
    const section = sectionRef.current;
    const root = rootRef.current;
    if (!root) return undefined;

    const track = root.querySelector<HTMLElement>('[data-tl-track]');
    const fill = root.querySelector<HTMLElement>('[data-tl-progress]');
    const line = root.querySelector<HTMLElement>('[data-tl-line]');
    const moto = root.querySelector<HTMLElement>('[data-tl-moto]');
    if (!track) return undefined;

    let motoTravelPx = 0;

    /** Dibuja la línea de progreso y posiciona la moto (con métricas caché). */
    const paint = (progress: number): void => {
      const p = gsap.utils.clamp(0, 1, progress);
      if (fill) gsap.set(fill, { scaleY: p });
      if (moto) gsap.set(moto, { y: p * motoTravelPx });
    };
    /** Métrica de la moto: alto de la línea menos alto de la propia moto. */
    const measure = (): void => {
      if (line && moto) motoTravelPx = Math.max(0, line.clientHeight - moto.offsetHeight);
      paint(ScrollTrigger.getById('tl-pin')?.progress ?? 0);
    };

    // Espacio recorrible: exceso del track sobre la ventana acotada (pin).
    const travel = (): number =>
      Math.max(0, track.scrollHeight - root.clientHeight);

    const ctx = gsap.context(() => {
      // Fill y moto parten en "meta" (0 %) antes de cualquier scroll;
      // xPercent -50 centra la moto sobre la línea de 1 px.
      gsap.set(fill, { scaleY: 0 });
      gsap.set(moto, { xPercent: -50, y: 0 });

      // Recorrido principal: pin de la sección + traslación del track.
      const scrollTween = gsap.to(track, {
        y: () => -travel(),
        ease: 'none',
        scrollTrigger: {
          id: 'tl-pin',
          trigger: root,
          start: 'top top',
          end: () => `+=${travel()}`,
          // Si el track no excede la ventana acotada, no anclar: contenido largo.
          pin: travel() > 600,
          anticipatePin: 1,
          scrub: true,
          invalidateOnRefresh: true,
          onToggle: (self) => {
            // will-change SOLO durante el pin (sin retener capa tras salir).
            track.style.willChange = self.isActive ? 'transform' : '';
          },
          onUpdate: (self) => paint(self.progress),
        },
      });

      const pinST = scrollTween.scrollTrigger;
      if (pinST && !pinST.pin) {
        // Sin pin posible (track corto): contenido completo y estático.
        paint(1);
      }

      // Entrada del bloque de título (QA-08: acotado a la sección).
      const head = section?.querySelector<HTMLElement>('[data-tl-head]');
      if (head) {
        gsap.from(head.children, {
          opacity: 0,
          y: 28,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: head, start: 'top 85%', once: true },
        });
      }

      // Hitos: revelados ligados a la MISMA animación contenedora.
      gsap.utils.toArray<HTMLElement>('[data-tl-item]', root).forEach((item) => {
        const reveal = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            containerAnimation: scrollTween,
            start: 'top 88%',
            once: true,
          },
        });
        reveal.from(item, { opacity: 0, y: 48, duration: 0.8, ease: 'power3.out' }, 0);
        const marker = item.querySelector<HTMLElement>('[data-tl-marker]');
        if (marker) reveal.from(marker, { scale: 0, duration: 0.45, ease: 'back.out(2)' }, 0.12);
      });

      ScrollTrigger.addEventListener('refresh', measure);
    }, rootRef);

    measure();

    return () => {
      ScrollTrigger.removeEventListener('refresh', measure);
      ctx.revert();
    };
    // `reduced` es estable para la vida de la página.
  }, [reduced]);

  const pinViewportClass = reduced
    ? 'relative mt-10 md:mt-14'
    : 'relative mt-10 md:mt-14 h-[100svh] overflow-hidden';

  return (
    <section
      id="trayectoria"
      ref={sectionRef}
      className="section scroll-mt-24"
      aria-labelledby="trayectoria-title"
    >
      <div className="container-x">
        <div data-tl-head className="max-w-2xl">
          <p className="eyebrow">Biografía · Trayectoria</p>
          <h2 id="trayectoria-title" className="mt-3 text-3xl text-mist md:text-5xl">
            De Moto3 a la <span className="accent-gradient">élite</span> con Aprilia
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ash md:text-base">
            Siete hitos verificados entre 2015 y 2026: del debut en Moto3 a la RS-GP26 de Aprilia Racing.
          </p>
        </div>

        {/* Ventana acotada del recorrido (se PINCHA durante el tramo) */}
        <div ref={rootRef} className={pinViewportClass}>
          {/* Track trasladado con el scroll */}
          <div data-tl-track className="relative">
            <div className="relative pt-2 pb-10 md:pb-16">
              {/* Línea vertical (decorativa) por la que "corre" la moto */}
              <div
                data-tl-line
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-4 w-px bg-line md:left-6"
              >
                <div data-tl-progress className="absolute inset-x-0 top-0 h-full origin-top bg-accent" />
                {/* Moto que recorre la línea según el progreso del pin */}
                <div
                  data-tl-moto
                  className={`absolute left-1/2 top-0 z-10 w-9 ${reduced ? 'hidden' : ''}`}
                >
                  <svg
                    viewBox="0 0 40 22"
                    fill="none"
                    className="h-auto w-full rotate-[50deg] drop-shadow-[0_0_7px_rgba(255,77,0,0.55)]"
                  >
                    <circle cx="10.5" cy="15" r="5" stroke="var(--color-mist)" strokeOpacity="0.55" strokeWidth="1.8" />
                    <circle cx="29.5" cy="15" r="5" stroke="var(--color-mist)" strokeOpacity="0.55" strokeWidth="1.8" />
                    <circle cx="10.5" cy="15" r="1.6" fill="var(--color-accent-300)" />
                    <circle cx="29.5" cy="15" r="1.6" fill="var(--color-accent-300)" />
                    <path
                      d="M4 10.5C7.5 5.5 15 4 21 6l7 3.2 6.4 4.1"
                      stroke="var(--color-accent)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                    <path d="M13 9.5 16 6.5" stroke="var(--color-accent-300)" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
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
        </div>
      </div>
    </section>
  );
}
