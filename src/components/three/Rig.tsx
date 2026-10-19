import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { clamp, damp, entranceProgress, type HeroState } from './pointer';

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
 * Con `prefers-reduced-motion` la cámara queda fija y no se lee el estado.
 */

interface RigProps {
  state: RefObject<HeroState>;
  mobile: boolean;
  reduced: boolean;
  children: ReactNode;
}

interface CameraBase {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
}

const DESKTOP: CameraBase = { x: 0, y: 1.05, z: 5.6, tx: 0, ty: 0.6 };
const PHONE: CameraBase = { x: 0, y: 1.6, z: 8.5, tx: 0, ty: 1 };

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

export default function Rig({ state, mobile, reduced, children }: RigProps) {
  const groupRef = useRef<Group>(null);
  const smooth = useRef({ x: 0, y: 0, scroll: 0 });
  const base = useMemo<CameraBase>(() => (mobile ? PHONE : DESKTOP), [mobile]);

  useFrame((frame, delta) => {
    const camera = frame.camera;

    if (reduced) {
      camera.position.set(base.x, base.y, base.z);
      camera.lookAt(base.tx, base.ty, 0);
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
      base.x + offsetX - p * SCROLL_SIDE,
      base.y + offsetY + idleY + p * SCROLL_RISE + (1 - entrance) * ENTRANCE_RISE,
      base.z + p * SCROLL_DOLLY + (1 - entrance) * ENTRANCE_DOLLY,
    );
    camera.lookAt(base.tx, base.ty - p * SCROLL_LOOK, 0);

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
