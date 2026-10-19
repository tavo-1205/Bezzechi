/**
 * Estado compartido del puntero dentro de la sección hero.
 * Se crea en `Hero3D` (DOM) y se consume en la escena 3D (`Rig`).
 * - x, y: coordenadas normalizadas [-1, 1] con respecto a la sección.
 * - hover: 0..1, se acerca a 1 cuando el puntero está sobre la moto.
 */
export interface HeroPointer {
  x: number;
  y: number;
  hover: number;
}
