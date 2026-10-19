/**
 * Estado compartido del hero entre el DOM (`Hero3D`) y la escena 3D.
 * Vive en `pointer.ts` por historia del proyecto, pero hoy cubre las tres
 * reactividades de H3.3: puntero, scroll de la sección y entrada autorizada.
 *
 * Es un objeto **mutable y estable** (se crea una sola vez con `createHeroState`)
 * y se lee/escribe en sitio: ni el DOM ni `useFrame` reservan memoria nueva por
 * evento o por frame.
 *
 * - x, y: puntero normalizado [-1, 1] respecto a la sección `#inicio`.
 * - hover: 0..1, se acerca a 1 cuando el puntero está sobre la moto.
 * - scroll: progreso 0..1 de la sección (0 = hero a pantalla completa,
 *   1 = hero totalmente fuera de la ventana). Reversible.
 * - entrance: `true` cuando `preloader:done` autoriza la animación de entrada
 *   (CONTRACTS §4.1) o cuando salta el timeout de seguridad.
 * - entranceAt: `performance.now()` de esa autorización (o -1 si aún no llegó).
 */

export interface HeroState {
  x: number;
  y: number;
  hover: number;
  scroll: number;
  entrance: boolean;
  entranceAt: number;
}

/** Duración de la entrada del hero (misma curva para cámara, moto y partículas). */
export const ENTRANCE_MS = 1200;

export function createHeroState(): HeroState {
  return { x: 0, y: 0, hover: 0, scroll: 0, entrance: false, entranceAt: -1 };
}

/** `Math.min/Math.max`, sin allocations (se usa dentro de `useFrame`). */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Progreso de la entrada 0..1 con ease-out cúbico: LLEGA EXACTAMENTE a 1 al
 * final (nada de lerps que se quedan asintóticos), así cámara, moto, glow y
 * partículas cierran en su estado de reposo sin saltos.
 */
export function entranceProgress(state: HeroState, now: number): number {
  if (!state.entrance || state.entranceAt < 0) return 0;
  const t = clamp((now - state.entranceAt) / ENTRANCE_MS, 0, 1);
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

/**
 * Amortiguación exponencial independiente de los fps: el factor se calcula con
 * `delta` en lugar de una constante fija (a 60 fps y a 30 fps converge igual).
 */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}
