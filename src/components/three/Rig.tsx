import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { HeroPointer } from './pointer';

/**
 * Rig de cámara + balanceo de la moto.
 * - Parallax suave del puntero (lerp exponencial hacia el offset normalizado).
 * - Balanceo/giro continuo de la moto; el "hover" sobre la zona de la moto
 *   amplía el giro.
 * - Con prefers-reduced-motion la cámara queda fija y la moto no se mueve.
 */

interface RigProps {
  pointerRef: RefObject<HeroPointer>;
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

export default function Rig({ pointerRef, mobile, reduced, children }: RigProps) {
  const groupRef = useRef<Group>(null);
  const smooth = useRef({ x: 0, y: 0 });
  const base = useMemo<CameraBase>(() => (mobile ? PHONE : DESKTOP), [mobile]);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    const camera = state.camera;

    if (reduced) {
      camera.position.set(base.x, base.y, base.z);
      camera.lookAt(base.tx, base.ty, 0);
      return;
    }

    const p = pointerRef.current;
    const k = 1 - Math.exp(-5 * d);
    smooth.current.x += (p.x - smooth.current.x) * k;
    smooth.current.y += (p.y - smooth.current.y) * k;

    const t = state.clock.elapsedTime;
    camera.position.set(
      base.x + smooth.current.x * 0.55,
      base.y + smooth.current.y * 0.3 + Math.sin(t * 0.35) * 0.05,
      base.z,
    );
    camera.lookAt(base.tx, base.ty, 0);

    const group = groupRef.current;
    if (group) {
      group.rotation.y = Math.sin(t * 0.35) * 0.14 + smooth.current.x * (0.1 + 0.25 * p.hover);
      group.rotation.x = Math.sin(t * 0.5) * 0.02 + smooth.current.y * 0.03;
      group.rotation.z = Math.sin(t * 0.7) * 0.012;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
