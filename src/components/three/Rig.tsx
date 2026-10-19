import { useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { clamp, damp, entranceProgress, type HeroState } from './pointer';
import type { HeroPose } from './heroLayout';

/**
 * Rig de cámara + balanceo de la moto. Mezcla **estable** de dos reactividades
 * que se suman (nunca se pisan entre ellas):
 * - puntero → parallax amortiguado (entrada `clamp`eada, factor exponencial
 *   dependiente de `delta`, sin allocations),
 * - scroll de la sección → la cámara retrocede y sube mientras el encuadre se
 *   abre; el progreso también se amortigua para que no haya saltos ni con
 *   scroll por saltos de ancla.
 * Al balanceo continuo (senos de periodo largo) se le suma el giro por hover y
 * el desplazamiento lateral del puntero.
 *
 * La cámara **base** ya no vive aquí: llega en `pose` (tabla de tramos de
 * `heroLayout`), así que la cámara se coloca en cada frame sin allocations y la
 * reactividad se suma siempre a la puesta en escena correcta.
 *
 * Con `prefers-reduced-motion` la cámara queda fija en la base de su tramo y no
 * se lee el estado.
 */

interface RigProps {
  state: RefObject<HeroState>;
  /** Puesta en escena del tramo actual (cámara base + punto de mira). */
  pose: HeroPose;
  reduced: boolean;
  children: ReactNode;
}

/* Amplitudes (todo deliberadamente pequeño: la escena se ve, no se mueve). */
const POINTER_X = 0.55;
const POINTER_Y = 0.3;
const POINTER_LIMIT = 0.6;
const SCROLL_DOLLY = 1.45;
const SCROLL_RISE = 0.5;
const SCROLL_SIDE = 0.25;
const SCROLL_LOOK = 0.2;
const ENTRANCE_DOLLY = 0.65;
const ENTRANCE_RISE = 0.2;

export default function Rig({ state, pose, reduced, children }: RigProps) {
  const groupRef = useRef<Group>(null);
  const smooth = useRef({ x: 0, y: 0, scroll: 0 });

  useFrame((frame, delta) => {
    const camera = frame.camera;
    const [camX, camY, camZ] = pose.cam;

    if (reduced) {
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, pose.lookY, 0);
      return;
    }

    const d = Math.min(delta, 0.1);
    const s = state.current;
    const now = performance.now();

    // Puntero amortiguado en bruto [-1,1] (clamp por si el DOM se salta el suyo):
    // el factor de cámara y el del balanceo se aplican en cada uso, igual que antes.
    smooth.current.x = damp(smooth.current.x, clamp(s.x, -1, 1), 5, d);
    smooth.current.y = damp(smooth.current.y, clamp(s.y, -1, 1), 5, d);
    // Progreso de scroll amortiguado: mismo valor para cámara y moto (Entrance).
    smooth.current.scroll = damp(smooth.current.scroll, clamp(s.scroll, 0, 1), 4.5, d);

    const p = smooth.current.scroll;
    const entrance = entranceProgress(s, now);
    // Offset de cámara: se SUMA al del scroll y se limita (nunca se pelean).
    const offsetX = clamp(smooth.current.x * POINTER_X, -POINTER_LIMIT, POINTER_LIMIT);
    const offsetY = clamp(smooth.current.y * POINTER_Y, -POINTER_LIMIT, POINTER_LIMIT);

    const t = frame.clock.elapsedTime;
    const idleY = Math.sin(t * 0.35) * 0.05;

    camera.position.set(
      camX + offsetX - p * SCROLL_SIDE,
      camY + offsetY + idleY + p * SCROLL_RISE + (1 - entrance) * ENTRANCE_RISE,
      camZ + p * SCROLL_DOLLY + (1 - entrance) * ENTRANCE_DOLLY,
    );
    camera.lookAt(0, pose.lookY - p * SCROLL_LOOK, 0);

    const group = groupRef.current;
    if (group) {
      const hover = clamp(s.hover, 0, 1);
      group.rotation.y = Math.sin(t * 0.35) * 0.14 + smooth.current.x * (0.1 + 0.25 * hover);
      group.rotation.x = Math.sin(t * 0.5) * 0.02 + smooth.current.y * 0.03;
      group.rotation.z = Math.sin(t * 0.7) * 0.012;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
