import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Registro único de ScrollTrigger — SIEMPRE, con o sin `prefers-reduced-motion`.
 *
 * Por qué existe este módulo: antes, `gsap.registerPlugin(ScrollTrigger)` vivía
 * dentro de `initSmoothScroll()` (que retorna temprano con movimiento reducido) y
 * dentro del `useEffect` de `Timeline` (que también retorna temprano). Resultado:
 * en un equipo con los efectos de animación desactivados —o en un tab con
 * `prefers-reduced-motion: reduce`— el plugin **nunca se registraba**, no se creaba
 * el pin de la trayectoria y la sección quedaba recortada y en blanco.
 *
 * Ahora el plugin se registra en el arranque del bundle (importado por `main.tsx`),
 * antes de que monte cualquier componente, y de forma idempotente.
 */
let registered = false;

/** Registra ScrollTrigger una única vez. Seguro de llamar desde cualquier sitio. */
export function ensureScrollTrigger(): typeof ScrollTrigger {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return ScrollTrigger;
}

/**
 * `true` si el usuario pide menos movimiento. Única fuente de verdad para todos
 * los consumidores (y consciente del override `?motion=full`, que parchea
 * `matchMedia` — se consulta en tiempo de llamada, nunca cacheado en módulo).
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Refresca las medidas de ScrollTrigger tras cambios que alteran el layout de
 * forma asíncrona: fuentes, imágenes, el final del preloader o un resize.
 * No hace nada si nadie usa ScrollTrigger (barato y sin efectos secundarios).
 */
export function refreshScrollTriggers(): void {
  const st = ensureScrollTrigger();
  if (!st.getAll().length) return;
  st.refresh();
}

// Registro en el arranque del módulo (importado desde `main.tsx`).
ensureScrollTrigger();
