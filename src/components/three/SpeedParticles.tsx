import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  Object3D,
  type InstancedMesh,
  type MeshBasicMaterial,
} from 'three';
import { damp, entranceProgress, type HeroState } from './pointer';

/**
 * Trazas de velocidad: un único `InstancedMesh` de barras finas que atraviesan
 * la escena en -X (el mundo pasa de largo respecto a la moto). Es el "postprocesado"
 * barato de la recta: `AdditiveBlending` + `toneMapped: false` hacen que las
 * trazas brillen sin pipeline de postprocesado.
 *
 * Coste controlado:
 * - 1 draw call; el material y la geometría los libera R3F al desmontar.
 * - Cero allocations dentro de `useFrame`: la matriz se reescribe con un
 *   `Object3D` memoizado y el reciclado es un salto de módulo (sin `Math.random`).
 * - Calles (y/z), longitud, grosor, color y brillo se resuelven una sola vez con
 *   un hash determinista, así la densidad es uniforme y estable en el tiempo.
 *
 * H3.3: la intensidad (opacidad y velocidad) sube con la entrada autorizada por
 * `preloader:done`; antes de la autorización las trazas están apagadas y lentas.
 */

interface SpeedParticlesProps {
  mobile: boolean;
  state: RefObject<HeroState>;
}

/** Opacidad del material en reposo y factor de velocidad de cada traza en reposo. */
const OPACITY = 0.85;
const INTENSITY_MIN = 0.28;
const SPEED_MIN = 0.32;

/** Semiancho del carril: la densidad es uniforme en [-LIMIT, LIMIT]. */
const LIMIT = 9;
const SPAN = LIMIT * 2;
/** Proporción de trazas en la capa cercana a cámara (parallax fuerte). */
const NEAR_RATIO = 0.22;

interface Streak {
  x: number;
  y: number;
  z: number;
  speed: number;
  /** Longitud de la traza en unidades de mundo (proporcional a la velocidad). */
  length: number;
  /** Grosor de la traza en unidades de mundo. */
  thickness: number;
  accent: boolean;
  ember: boolean;
  bright: number;
}

/** Hash determinista 0..1: sin estado, sin allocations y estable entre cargas. */
function hash(n: number): number {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function createStreak(index: number, near: boolean): Streak {
  const seed = index + 1;
  const r = (salt: number): number => hash(seed * 7.13 + salt);

  // Capa cercana: menos trazas, más rápidas y algo más gruesas (parallax);
  // capa principal: reparto sesgado hacia la altura de la moto (suelo a ~2 m).
  const speed = near ? 11 + r(1) * 9 : 6 + r(1) * 7;
  const y = near ? -0.25 + Math.pow(r(2), 1.2) * 2.1 : -0.3 + Math.pow(r(2), 1.35) * 2.3;
  const z = near ? 1.2 + r(3) * 2.2 : -4.6 + r(3) * 5.4;

  return {
    x: -LIMIT + r(4) * SPAN,
    y,
    z,
    speed,
    length: Math.min(0.2 + speed * 0.075, 1.7),
    thickness: near ? 0.008 + r(5) * 0.007 : 0.005 + r(5) * 0.004,
    accent: r(6) < (near ? 0.3 : 0.16),
    ember: r(7) < 0.5,
    bright: 0.3 + r(8) * 0.5,
  };
}

/** Matriz de una traza (módulo: sin closures nuevas por frame). */
function writeStreak(dummy: Object3D, mesh: InstancedMesh, index: number, streak: Streak): void {
  dummy.position.set(streak.x, streak.y, streak.z);
  dummy.scale.set(streak.length, streak.thickness, streak.thickness);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

export default function SpeedParticles({ mobile, state }: SpeedParticlesProps) {
  const count = mobile ? 96 : 240;
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const intensity = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const palette = useMemo(
    () => ({
      mist: new Color('#f6f6f8'),
      ash: new Color('#9a9aa4'),
      accent: new Color('#ff4d00'),
      ember: new Color('#ff8a3d'),
    }),
    [],
  );

  const streaks = useMemo<Streak[]>(() => {
    const near = Math.round(count * NEAR_RATIO);
    return Array.from({ length: count }, (_, index) => createStreak(index, index < near));
  }, [count]);

  // Matrices y colores iniciales (antes del primer frame).
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    const color = new Color();
    for (let i = 0; i < streaks.length; i += 1) {
      const streak = streaks[i];
      writeStreak(dummy, mesh, i, streak);
      if (streak.accent) color.copy(streak.ember ? palette.ember : palette.accent);
      else color.copy(hash((i + 1) * 9.4 + 4) < 0.35 ? palette.ash : palette.mist);
      color.multiplyScalar(streak.bright);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [streaks, dummy, palette]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const d = Math.min(delta, 0.1);

    // Intensidad de entrada (0 → 1): arranca apagada y sube tras `preloader:done`.
    const target = entranceProgress(state.current, performance.now());
    intensity.current = damp(intensity.current, target, 3, d);
    const speedScale = SPEED_MIN + (1 - SPEED_MIN) * intensity.current;
    const material = materialRef.current;
    if (material) {
      const opacity = OPACITY * (INTENSITY_MIN + (1 - INTENSITY_MIN) * intensity.current);
      if (Math.abs(material.opacity - opacity) > 0.002) material.opacity = opacity;
    }

    for (let i = 0; i < streaks.length; i += 1) {
      const streak = streaks[i];
      streak.x -= streak.speed * d * speedScale;
      // Reciclado por módulo: mantiene la densidad uniforme y no reordena calles.
      while (streak.x < -LIMIT) streak.x += SPAN;
      writeStreak(dummy, mesh, i, streak);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ffffff"
        transparent
        opacity={OPACITY * INTENSITY_MIN}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
