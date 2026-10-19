import { useEffect, useRef, type ReactElement } from 'react';
/**
 * Barra de progreso de página "tipo circuito" (elemento DECORATIVO).
 *
 * - Barra fija y fina (2 px) en `--color-accent` sobre `--color-line`, con un
 *   marcador tipo moto/punto que avanza con el progreso de scroll del documento.
 * - `aria-hidden="true"`: puramente decorativa, no se anuncia.
 * - Cero desbordamiento horizontal: la barra se dibuja con `scaleX`
 *   (transform, sin repintar layout) y el marcador se traslada SOLO dentro del
 *   ancho medido (nunca supera el borde derecho de la ventana).
 * - Sin dependencia directa de Lenis: escucha `scroll`/`resize` nativos con
 *   rAF-throttle (CONTRACTS §4.2; Lenis actualiza scroll nativo en window).
 * - Con `prefers-reduced-motion` no se renderiza (invisible/estática).
 *
 * Ejemplo de montaje (lo integra el Director en `App.tsx`):
 *   <ScrollProgress />
 */

const BAR_HEIGHT_PX = 2; // fina: 2 px (requisito 2-3 px)
const MARKER_SIZE_PX = 9;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Silueta mínima de moto para el marcador (decorativa). */
function MarkerMoto(): ReactElement {
  return (
    <svg viewBox="0 0 40 22" fill="none" className="h-auto w-full rotate-[50deg]">
      <circle cx="10.5" cy="15" r="5" stroke="var(--color-accent-300)" strokeOpacity="0.65" strokeWidth="2" />
      <circle cx="29.5" cy="15" r="5" stroke="var(--color-accent-300)" strokeOpacity="0.65" strokeWidth="2" />
      <path
        d="M4 10.5C7.5 5.5 15 4 21 6l7 3.2 6.4 4.1"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ScrollProgress(): ReactElement | null {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  // Evaluación estable por render; `matchMedia` no existe en SSR (guard csr).
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) return undefined;

    const track = trackRef.current;
    const bar = barRef.current;
    const marker = markerRef.current;
    if (!track || !bar || !marker) return undefined;

    let width = track.clientWidth;
    let usable = Math.max(0, width - MARKER_SIZE_PX);
    let frame = 0;

    const paint = (): void => {
      frame = 0;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const raw = (window.scrollY || doc.scrollTop || 0) / max;
      const progress = clamp01(raw);

      // Barra: scaleX desde la izquierda (sin tocar layout).
      bar.style.transform = `scaleX(${progress})`;
      // Marcador: desplazamiento clamp dentro del ancho medido (sin overflow).
      marker.style.transform = `translate3d(${usable * progress}px, 0, 0)`;
    };

    const measure = (): void => {
      width = track.clientWidth;
      usable = Math.max(0, width - MARKER_SIZE_PX);
    };

    const schedule = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    const onResize = (): void => {
      measure();
      schedule();
    };

    measure();
    paint();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      aria-hidden="true"
      ref={trackRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60]"
      style={{ height: BAR_HEIGHT_PX }}
    >
      {/* Riel de fondo + barra de progreso en acento */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--color-line)' }}
      />
      <div
        ref={barRef}
        className="absolute inset-0 origin-left"
        style={{
          height: BAR_HEIGHT_PX,
          backgroundColor: 'var(--color-accent)',
          transform: 'scaleX(0)',
        }}
      />
      {/* Marcador sobre el borde de la barra (centrado, sin salir de pantalla) */}
      <div
        ref={markerRef}
        className="absolute left-0 will-change-[transform]"
        style={{
          top: -(MARKER_SIZE_PX - BAR_HEIGHT_PX) / 2,
          width: MARKER_SIZE_PX,
          height: MARKER_SIZE_PX,
          transform: 'translate3d(0, 0, 0)',
          filter: 'drop-shadow(0 0 6px rgba(255, 77, 0, 0.7))',
        }}
      >
        <MarkerMoto />
      </div>
    </div>
  );
}
