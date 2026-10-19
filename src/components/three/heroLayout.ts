import type { HeroTier } from './useBreakpoint';

/**
 * Puesta en escena del hero por tramo de composición: una fila = todo lo que
 * sitúa la cámara y la moto, para que cambiar de tramo no obligue a tocar
 * números sueltos repartidos por la escena.
 *
 * Referencias de escala (ver `Bike.tsx`): la moto mide ≈ 2,4 u de largo, sus
 * ruedas tocan y = 0 y su punto más alto está en y ≈ 1,05. Con `fov` 35 el
 * ecuador del encuadre (y = `lookY`) cae en el centro del lienzo.
 *
 * `fog` acompaña a la cámara: el plano de niebla estaba calibrado para z ≈ 5,6
 * y a z ≥ 12 la moto se apagaría dentro de la niebla, así que el tramo que
 * retrocede la cámara también aleja la niebla (mismo efecto de bruma en las
 * trazas de fondo, sin velar al sujeto).
 */
export interface HeroPose {
  /** Posición de la cámara [x, y, z]; la reactividad de `Rig` se suma encima. */
  cam: [number, number, number];
  /** Altura del punto de mira (el objetivo es siempre x = 0, z = 0). */
  lookY: number;
  /** Posición base de la moto [x, y]. */
  bike: [number, number];
  /** Plano de niebla [near, far]. */
  fog: [number, number];
}

export const HERO_POSES: Record<HeroTier, HeroPose> = {
  // Móvil: cámara alta y lejos, moto centrada y algo baja (sin cambios).
  phone: {
    cam: [0, 1.6, 8.5],
    lookY: 1,
    bike: [0, -0.15],
    fog: [8, 15],
  },
  // Tablet apaisada / portátil pequeño (768–1100 px): el titular se acorta
  // (ver `Hero3D`) y la moto se va abajo a la derecha. A 800 px el titular
  // acaba en ~403 px y la caja de la moto empieza en ~444 px (≈40 px de aire);
  // ni el subtítulo ni el CTA llegan a la moto y la moto entra entera incluso
  // en el extremo estrecho del rango (769 px de ancho).
  compact: {
    cam: [0, 1.3, 8.4],
    lookY: 0.6,
    bike: [1.55, -0.12],
    fog: [13, 22],
  },
  // Tablet en pie (768–1100 px de ancho, lienzo estrecho): la mitad derecha se
  // queda sin ancho útil, así que la cámara retrocede más y la moto se desplaza
  // aún más a la derecha; así ocupa el ancho sobrante sin llegar a recortarse.
  'compact-portrait': {
    cam: [0, 1.45, 14],
    lookY: 0.7,
    bike: [1.9, -0.1],
    fog: [16, 25],
  },
  // Escritorio ancho: titular a la izquierda, moto a la derecha (sin cambios).
  wide: {
    cam: [0, 1.05, 5.6],
    lookY: 0.6,
    bike: [1.15, 0],
    fog: [8, 15],
  },
};
