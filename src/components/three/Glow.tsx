import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, type MeshBasicMaterial, type SpriteMaterial } from 'three';
import { createGlowTexture } from './textures';

/**
 * Postprocesado ligero **sin dependencias**: en lugar de un pipeline de bloom
 * se finge con tres capas aditivas sobre el fondo oscuro
 * 1. halo grande tras la moto (el bloom "se come" el contorno del carenado
 *    porque el sprite queda ocluido por la geometría opaca),
 * 2. núcleo cálido más brillante sobre el escape/cárter,
 * 3. charco de luz de boxes en el asfalto (plano horizontal aditivo).
 *
 * La caída del degradado la aporta el canal alfa de `createGlowTexture`, así que
 * la intensidad se controla solo con `opacity`. El pulso es lentísimo y con
 * `prefers-reduced-motion` se queda congelado en su valor base (0 coste/frame).
 */

interface HeroGlowProps {
  /** Centro X de la moto en la escena (móvil = 0, escritorio ≈ 1,15). */
  x: number;
  reduced: boolean;
}

/** Opacidades base (valor inicial de los materiales y valor medio del pulso). */
const HALO_OPACITY = 0.32;
const CORE_OPACITY = 0.4;
const GROUND_OPACITY = 0.26;

export default function HeroGlow({ x, reduced }: HeroGlowProps) {
  const glow = useMemo(() => createGlowTexture(128), []);
  useEffect(() => () => glow.dispose(), [glow]);

  const halo = useRef<SpriteMaterial>(null);
  const core = useRef<SpriteMaterial>(null);
  const ground = useRef<MeshBasicMaterial>(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    if (halo.current) halo.current.opacity = HALO_OPACITY + Math.sin(t * 0.55) * 0.035;
    if (core.current) core.current.opacity = CORE_OPACITY + Math.sin(t * 0.85 + 1.1) * 0.06;
    if (ground.current) ground.current.opacity = GROUND_OPACITY + Math.sin(t * 0.7 + 2.2) * 0.04;
  });

  return (
    <group>
      {/* Halo: bloom falso tras el carenado. */}
      <sprite position={[x + 0.08, 0.72, -1.9]} scale={[5.2, 3.2, 1]}>
        <spriteMaterial
          ref={halo}
          map={glow}
          color="#ff4d00"
          transparent
          opacity={HALO_OPACITY}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* Núcleo cálido sobre el escape/cárter. */}
      <sprite position={[x + 0.12, 0.78, -1.3]} scale={[2.6, 1.8, 1]}>
        <spriteMaterial
          ref={core}
          map={glow}
          color="#ff8a3d"
          transparent
          opacity={CORE_OPACITY}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* Charco de luz bajo la moto (dibujado antes que la sombra de contacto). */}
      <mesh position={[x, 0.004, 0.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[5, 2.6, 1]} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={ground}
          map={glow}
          color="#ff4d00"
          transparent
          opacity={GROUND_OPACITY}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
