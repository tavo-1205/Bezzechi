import { useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { clamp, damp, entranceProgress, type HeroState } from './pointer';

/**
 * Entrada del hero (CONTRACTS §4.1) y desplazamiento por scroll de la moto.
 *
 * - Hasta que `preloader:done` autoriza la entrada (`state.entrance`), la moto
 *   está algo más pequeña, más baja y al fondo; con `entranceProgress` sube a su
 *   marca con ease-out (llega exactamente a 1 → cierra sin salto). La cámara hace
 *   su pequeño asentamiento en paralelo desde `Rig`.
 * - Con scroll, la moto se desplaza y gira muy levemente (`clamp` + amortiguado)
 *   para acompañar el "retroceso" de la cámara: todo reversible al volver arriba.
 * - Con `prefers-reduced-motion` no se toca el grupo: se queda ya en su estado
 *   final (identidad + posición base), sin animación alguna.
 */

interface EntranceProps {
  state: RefObject<HeroState>;
  reduced: boolean;
  /** Posición base del grupo de la moto (depende del tramo: ver `HERO_POSES`). */
  x: number;
  y: number;
  children: ReactNode;
}

const SCALE_FROM = 0.9;
const DROP = 0.22;
const DEPTH = 0.95;
const SCROLL_TURN = 0.2;
const SCROLL_DRIFT = 0.25;

export default function Entrance({ state, reduced, x, y, children }: EntranceProps) {
  const groupRef = useRef<Group>(null);
  const smooth = useRef(0);

  useFrame((_frame, delta) => {
    if (reduced) return;
    const group = groupRef.current;
    if (!group) return;

    const d = Math.min(delta, 0.1);
    const s = state.current;
    const entrance = entranceProgress(s, performance.now());
    smooth.current = damp(smooth.current, clamp(s.scroll, 0, 1), 4.5, d);
    const p = smooth.current;

    group.scale.setScalar(SCALE_FROM + (1 - SCALE_FROM) * entrance);
    group.position.set(x - p * SCROLL_DRIFT, y - (1 - entrance) * DROP + p * 0.04, -(1 - entrance) * DEPTH);
    group.rotation.y = p * SCROLL_TURN;
  });

  return (
    <group ref={groupRef} position={[x, y, 0]}>
      {children}
    </group>
  );
}
