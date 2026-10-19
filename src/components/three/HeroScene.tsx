import { Suspense, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import Bike from './Bike';
import Rig from './Rig';
import SpeedParticles from './SpeedParticles';
import { useBreakpoint } from './useBreakpoint';
import type { HeroPointer } from './pointer';

/**
 * Composición de la escena 3D del hero:
 * - Iluminación con <Environment> + <Lightformer> locales (sin HDR externo).
 * - Moto procedural con sombra de contacto; en móvil se pide detalle reducido
 *   a `Bike` (menos draw calls) manteniendo los mismos materiales.
 * - Trazas de velocidad instanciadas (ausentes con reduced motion).
 */

interface HeroSceneProps {
  pointerRef: RefObject<HeroPointer>;
  reduced: boolean;
}

const MOBILE_CAM: [number, number, number] = [0, 1.6, 8.5];
const DESKTOP_CAM: [number, number, number] = [0, 1.05, 5.6];

export default function HeroScene({ pointerRef, reduced }: HeroSceneProps) {
  const mobile = useBreakpoint('(max-width: 767px)');
  const bikeX = mobile ? 0 : 1.15;

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: mobile ? MOBILE_CAM : DESKTOP_CAM, fov: 35 }}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#08080a', 8, 15]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.3} color="#f6f6f8" />
      <pointLight position={[-3, 1.4, -2]} intensity={14} distance={12} color="#ff4d00" />
      {/* Contraluz frío: perfila el carbono y el metal en el close-up. */}
      <directionalLight position={[-4, 2.4, -4]} intensity={0.55} color="#8ab4ff" />

      <Suspense fallback={null}>
        <Rig pointerRef={pointerRef} mobile={mobile} reduced={reduced}>
          <group position={[bikeX, mobile ? -0.15 : 0, 0]}>
            <Bike reduced={reduced} detailed={!mobile} />
          </group>
        </Rig>

        <ContactShadows
          position={[bikeX, 0.002, 0]}
          scale={6}
          blur={2.4}
          far={1.4}
          opacity={0.5}
          resolution={192}
          color="#000000"
        />

        {!reduced && <SpeedParticles mobile={mobile} />}

        {/* Reflexiones locales: caja de luz con Lightformers (sin HDR remoto). */}
        <Environment resolution={256} frames={1}>
          <Lightformer
            form="rect"
            intensity={2.6}
            color="#ffffff"
            position={[0, 4, 3]}
            scale={[8, 3, 1]}
            rotation={[-Math.PI / 3, 0, 0]}
            target={[0, 0, 0]}
          />
          <Lightformer form="rect" intensity={3.2} color="#ff4d00" position={[4, 1.2, 2]} scale={[4, 1.2, 1]} target={[0, 0.6, 0]} />
          <Lightformer form="rect" intensity={1.8} color="#8ab4ff" position={[-4, 2, -2]} scale={[5, 2, 1]} target={[0, 0.6, 0]} />
          <Lightformer form="ring" intensity={1.4} color="#ff8a3d" position={[-2, 0.8, 3]} scale={2} target={[0, 0.6, 0]} />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
