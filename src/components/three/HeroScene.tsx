import { Suspense, useMemo, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import Bike from './Bike';
import Rig from './Rig';
import Entrance from './Entrance';
import HeroGlow from './Glow';
import SpeedParticles from './SpeedParticles';
import { HERO_POSES } from './heroLayout';
import type { HeroTier } from './useBreakpoint';
import type { HeroState } from './pointer';

/**
 * Composición de la escena 3D del hero:
 * - Iluminación con <Environment> + <Lightformer> locales (sin HDR externo).
 * - Moto procedural con sombra de contacto; en móvil se pide detalle reducido
 *   a `Bike` (menos draw calls) manteniendo los mismos materiales.
 * - Trazas de velocidad instanciadas (ausentes con reduced motion) y halos
 *   aditivos como postprocesado ligero (estáticos con reduced motion).
 * - Reactividad (H3.3) leída del estado compartido: `Rig` (cámara),
 *   `Entrance` (entrada + desplazamiento por scroll de la moto), glow y
 *   partículas. Todo ello se desactiva con reduced motion.
 *
 * El encuadre (cámara, sitio de la moto y plano de niebla) **no** se decide
 * aquí: llega resuelto en `tier` desde `Hero3D` (único dueño de las media
 * queries) y se lee de la tabla de tramos `HERO_POSES`. Así el DOM y la escena
 * comparten el mismo tramo y no hay dos `matchMedia` que puedan discrepar.
 */

interface HeroSceneProps {
  state: RefObject<HeroState>;
  reduced: boolean;
  /** Tramo de composición resuelto por `Hero3D`. */
  tier: HeroTier;
}

export default function HeroScene({ state, reduced, tier }: HeroSceneProps) {
  const pose = HERO_POSES[tier];
  const mobile = tier === 'phone';
  const [bikeX, bikeY] = pose.bike;

  // Objetos estables por tramo: R3F solo reaplica props cuando cambia la pose.
  const camera = useMemo(() => ({ position: pose.cam, fov: 35 }), [pose]);
  const shadow = useMemo<[number, number, number]>(() => [bikeX, 0.002, 0], [bikeX]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={camera}
      aria-hidden="true"
    >
      <fog attach="fog" args={['#08080a', pose.fog[0], pose.fog[1]]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.3} color="#f6f6f8" />
      <pointLight position={[-3, 1.4, -2]} intensity={14} distance={12} color="#ff4d00" />
      {/* Contraluz frío: perfila el carbono y el metal en el close-up. */}
      <directionalLight position={[-4, 2.4, -4]} intensity={0.55} color="#8ab4ff" />

      <Suspense fallback={null}>
        <Rig state={state} pose={pose} reduced={reduced}>
          <Entrance state={state} reduced={reduced} x={bikeX} y={bikeY}>
            <Bike reduced={reduced} detailed={!mobile} />
          </Entrance>
        </Rig>

        <ContactShadows
          position={shadow}
          scale={6}
          blur={2.4}
          far={1.4}
          opacity={0.5}
          resolution={192}
          color="#000000"
        />

        <HeroGlow x={bikeX} reduced={reduced} state={state} />

        {!reduced && <SpeedParticles mobile={mobile} state={state} />}

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
