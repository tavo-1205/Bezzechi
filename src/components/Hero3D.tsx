import { useRef, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import HeroScene from './three/HeroScene';
import { scrollToSection } from '../lib/scroll';
import type { HeroPointer } from './three/pointer';

/* --------------------------------------------------------------------------
 * Sección hero (#inicio) con escena 3D de fondo y tipografía encima.
 * - Canvas 3D en capa absoluta con pointer-events-none; el puntero se lee
 *   desde la propia sección y se comparte con la escena vía `pointerRef`.
 * - Respeta prefers-reduced-motion: escena estática y sin reveal.
 * ------------------------------------------------------------------------ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Hero3D(): ReactElement {
  const reduced = useReducedMotion() ?? false;
  const pointerRef = useRef<HeroPointer>({ x: 0, y: 0, hover: 0 });

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    pointerRef.current = {
      x: px * 2 - 1,
      y: -(py * 2 - 1),
      hover: px > 0.4 && py > 0.35 ? 1 : 0,
    };
  };

  const handlePointerLeave = (): void => {
    pointerRef.current = { x: 0, y: 0, hover: 0 };
  };

  const clipReveal = (delay: number): MotionProps =>
    reduced
      ? {}
      : {
          initial: { clipPath: 'inset(0 100% 0 0)', y: 30, opacity: 0 },
          animate: { clipPath: 'inset(0% 0% 0% 0%)', y: 0, opacity: 1 },
          transition: { duration: 0.95, delay, ease: EASE },
        };

  const fadeUp = (delay: number): MotionProps =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        };

  return (
    <section
      id="inicio"
      className="section relative min-h-screen scroll-mt-24 overflow-hidden py-0"
      aria-labelledby="inicio-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Fondo: rejilla + resplandor naranja tras la moto */}
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_72%_62%,rgba(255,77,0,0.14),transparent_70%)]"
        aria-hidden="true"
      />

      {/* Número 72 gigante de fondo */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex translate-x-[8%] items-center select-none" aria-hidden="true">
        <span className="num font-display text-outline text-[clamp(16rem,40vw,42rem)] leading-none font-black">72</span>
      </div>

      {/* Capa 3D */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <HeroScene pointerRef={pointerRef} reduced={reduced} />
      </div>

      {/* Fade inferior para fundir con la siguiente sección */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink"
        aria-hidden="true"
      />

      {/* Contenido tipográfico */}
      <div className="container-x relative z-10 flex min-h-screen flex-col justify-center pt-28 pb-28">
        <motion.p className="eyebrow" {...fadeUp(0.05)}>
          Aprilia Racing · #72 · RS-GP26
        </motion.p>

        <h1 id="inicio-title" className="font-display mt-4 text-[clamp(2.6rem,9vw,7.5rem)] leading-[0.92] font-black tracking-tight text-mist">
          <motion.span className="block" {...clipReveal(0.15)}>
            MARCO
          </motion.span>
          <motion.span className="accent-gradient block" {...clipReveal(0.3)}>
            BEZZECCHI
          </motion.span>
        </h1>

        <motion.p className="font-cond mt-6 max-w-xl text-base tracking-[0.16em] text-ash uppercase md:text-xl" {...fadeUp(0.45)}>
          Piloto de Aprilia Racing sobre la RS-GP26 en el Mundial MotoGP™ 2026
        </motion.p>

        <motion.div {...fadeUp(0.6)}>
          <button
            type="button"
            onClick={() => scrollToSection('marcador')}
            className="group mt-14 inline-flex w-fit items-center gap-4"
          >
            <span className="font-cond text-[0.72rem] tracking-[0.35em] text-ash uppercase transition-colors group-hover:text-mist">
              Desliza
              {/* El nombre accesible debe contener el texto visible (WCAG 2.5.3). */}
              <span className="sr-only"> al marcador del Mundial</span>
            </span>
            <span className="relative h-12 w-px overflow-hidden bg-line" aria-hidden="true">
              <motion.span
                className="absolute inset-x-0 top-0 h-4 bg-accent"
                animate={reduced ? undefined : { y: [-16, 48] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/** Fallback visual mientras carga la escena 3D (usar en <Suspense>). */
export function HeroSkeleton(): ReactElement {
  return (
    <section
      id="inicio"
      className="section relative min-h-screen scroll-mt-24 overflow-hidden py-0"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Cargando la experiencia 3D del hero…
      </p>
      <div className="container-x relative pt-28">
        <div className="skeleton h-3 w-56" aria-hidden="true" />
        <div className="skeleton mt-6 h-14 w-3/4 max-w-2xl md:h-24" aria-hidden="true" />
        <div className="skeleton mt-4 h-14 w-1/2 max-w-xl md:h-24" aria-hidden="true" />
        <div className="skeleton mt-8 h-4 w-72 max-w-full" aria-hidden="true" />
        <div className="skeleton mt-14 h-10 w-36 rounded-full" aria-hidden="true" />
      </div>
      <div
        className="skeleton absolute right-[-10%] bottom-[10%] h-64 w-64 rounded-full opacity-30 md:h-96 md:w-96"
        aria-hidden="true"
      />
    </section>
  );
}
