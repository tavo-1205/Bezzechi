import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Object3D, type InstancedMesh } from 'three';

/**
 * Trazas de velocidad: InstancedMesh de cajas finas que se desplazan en -X
 * (el mundo pasa de largo respecto a la moto) y se reciclan al salir del
 * límite. Se renderizan menos instancias en móvil.
 */

interface SpeedParticlesProps {
  mobile: boolean;
}

const LIMIT = 9;

interface Particle {
  x: number;
  y: number;
  z: number;
  speed: number;
}

export default function SpeedParticles({ mobile }: SpeedParticlesProps) {
  const count = mobile ? 90 : 220;
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const colors = useMemo(
    () => ({ mist: new Color('#9a9aa4'), accent: new Color('#ff4d00') }),
    [],
  );

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 20 - 10,
        y: Math.random() * 3 - 0.4,
        z: Math.random() * 6 - 4.5,
        speed: 5 + Math.random() * 9,
      })),
    [count],
  );

  // Posiciones y colores iniciales (antes del primer frame).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new Color();
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.speed * 0.08, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.copy(Math.random() < 0.28 ? colors.accent : colors.mist);
      color.multiplyScalar(0.55 + Math.random() * 0.45);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [particles, dummy, colors]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const d = Math.min(delta, 0.1);
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x -= p.speed * d;
      if (p.x < -LIMIT) {
        p.x = LIMIT + Math.random() * 2;
        p.y = Math.random() * 3 - 0.4;
        p.z = Math.random() * 6 - 4.5;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.speed * 0.08, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 0.007, 0.007]} />
      <meshBasicMaterial color="#c9c9d2" transparent opacity={0.65} toneMapped={false} />
    </instancedMesh>
  );
}
