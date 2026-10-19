import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { motion, useReducedMotion, type MotionProps } from 'framer-motion';
import HeroScene from './three/HeroScene';
import MagneticButton from './MagneticButton';
import { scrollToSection } from '../lib/scroll';
import { ENTRANCE_MS, clamp, createHeroState, type HeroState } from './three/pointer';
import { isCompactTier, useHeroTier } from './three/useBreakpoint';

/* --------------------------------------------------------------------------
 * Sección hero (#inicio) con escena 3D de fondo y tipografía encima.
 * - Canvas 3D en capa absoluta con pointer-events-none; el puntero se lee
 *   desde la propia sección y se comparte con la escena vía `stateRef`
 *   (estado mutable, sin allocations por evento).
 * - Reactividad (CONTRACTS §4.2): eventos NATIVOS `scroll`/`resize` con
 *   rAF-throttle escribiendo el progreso de la sección en `state.scroll`; la
 *   fuente de verdad del suavizado está en la escena (`Rig`/`Entrance`).
 * - Entrada (CONTRACTS §4.1): hasta `preloader:done` (o
 *   `dataset.preloader === 'done'` al montar, o timeout de seguridad de 5 s) el
 *   hero no arranca su animación de entrada; con reduced motion aparece ya en su
 *   estado final, sin animación.
 * - Composición (responsive): este componente es el **único** dueño del tramo
 *   (`useHeroTier`, media queries reales) y lo comparte con la escena. En el
 *   tramo intermedio (768–1100 px) el titular se acorta y la moto se compone
 *   abajo a la derecha, para que titular y moto se lean por separado; móvil
 *   (< 768 px) y escritorio ancho (> 1100 px) quedan como estaban.
 * ------------------------------------------------------------------------ */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Red de seguridad si `preloader:done` no llega nunca (CONTRACTS §4.1). */
const ENTRANCE_TIMEOUT_MS = 5000;

export default function Hero3D(): ReactElement {
  const reduced = useReducedMotion() ?? false;
  // Tramo de composición (móvil / intermedio / escritorio ancho); se comparte
  // con la escena 3D para que DOM y canvas nunca discrepen.
  const tier = useHeroTier();
  const compact = isCompactTier(tier);
  const stateRef = useRef<HeroState>(createHeroState());
  const sectionRef = useRef<HTMLElement>(null);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    // Se muta en sitio el objeto compartido: cero basura por evento.
    const state = stateRef.current;
    state.x = clamp(px * 2 - 1, -1, 1);
    state.y = clamp(-(py * 2 - 1), -1, 1);
    state.hover = px > 0.4 && py > 0.35 ? 1 : 0;
  };

  const handlePointerLeave = (): void => {
    const state = stateRef.current;
    state.x = 0;
    state.y = 0;
    state.hover = 0;
  };

  // Progreso de scroll de la propia sección (0 = hero entero, 1 = fuera de vista).
  useEffect(() => {
    if (reduced) return;
    const state = stateRef.current;
    let frame = 0;

    const update = (): void => {
      frame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      state.scroll = rect.height > 0 ? clamp(-rect.top / rect.height, 0, 1) : 0;
    };
    const request = (): void => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    return () => {
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reduced]);

  // Entrada autorizada por el semáforo (`preloader:done`) con timeout de 5 s.
  useEffect(() => {
    const state = stateRef.current;
    if (reduced) {
      // Estado final desde el primer frame, sin animación.
      state.entrance = true;
      state.entranceAt = performance.now() - ENTRANCE_MS;
      return;
    }

    let done = false;
    const authorize = (): void => {
      if (done) return;
      done = true;
      state.entrance = true;
      state.entranceAt = performance.now();
      window.clearTimeout(timer);
    };
    const timer = window.setTimeout(authorize, ENTRANCE_TIMEOUT_MS);

    if (document.documentElement.dataset.preloader === 'done') authorize();
    else window.addEventListener('preloader:done', authorize, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('preloader:done', authorize);
    };
  }, [reduced]);

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
      ref={sectionRef}
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

      {/* Número 72 gigante de fondo (decorativo, QA-03).
          El contenedor ocupa exactamente la caja de la sección (`inset-0`) y
          recorta su propio contenido (`overflow-hidden`), mientras que el
          desplazamiento que saca el "72" por el borde va en el `span`
          (`translate-x-[8%]`, mismo píxel que antes). Así el "72" sigue asomando
          recortado por el borde derecho pero su caja nunca sale del viewport:
          no puede aportar ancho al `scrollWidth` del documento. */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden select-none"
        aria-hidden="true"
      >
        <span className="num font-display text-outline translate-x-[8%] text-[clamp(16rem,40vw,42rem)] leading-none font-black">
          72
        </span>
      </div>

      {/* Capa 3D */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <HeroScene state={stateRef} reduced={reduced} tier={tier} />
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

        {/* Titular: en el tramo intermedio se acorta (7vw) para dejar la mitad
            derecha a la moto; fuera de él mantiene el tamaño de siempre. */}
        <h1
          id="inicio-title"
          className={`font-display mt-4 leading-[0.92] font-black tracking-tight text-mist ${
            compact ? 'text-[clamp(2.6rem,7vw,6.5rem)]' : 'text-[clamp(2.6rem,9vw,7.5rem)]'
          }`}
        >
          <motion.span className="block" {...clipReveal(0.15)}>
            MARCO
          </motion.span>
          {/* Espacio real entre los dos spans: son de bloque, así que el layout no
              cambia, pero el nombre accesible del h1 pasa de "MARCOBEZZECCHI" a
              "Marco Bezzecchi" (y el texto copiado también). */}
          {' '}
          <motion.span className="accent-gradient block" {...clipReveal(0.3)}>
            BEZZECCHI
          </motion.span>
        </h1>

        <motion.p
          className={`font-cond mt-6 text-base tracking-[0.16em] text-ash uppercase md:text-xl ${
            compact ? 'max-w-sm' : 'max-w-xl'
          }`}
          {...fadeUp(0.45)}
        >
          Piloto de Aprilia Racing sobre la RS-GP26 en el Mundial MotoGP™ 2026
        </motion.p>

        {/* `w-fit` en el wrapper + `flex` en el botón: la caja del indicador
            arranca exactamente en el borde de contenido de `container-x`
            (mismo eje que el titular), sin depender del flujo en línea. */}
        <motion.div className="w-fit" {...fadeUp(0.6)}>
          {/* `MagneticButton` (uidesign, CONTRACTS §5): mismo onClick/a11y de antes,
              atracción sutil (0.25); se desactiva con reduced motion y puntero grueso. */}
          <MagneticButton
            onClick={() => scrollToSection('marcador')}
            strength={0.25}
            className="group mt-14 flex items-center gap-4"
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
          </MagneticButton>
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
