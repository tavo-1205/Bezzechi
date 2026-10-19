import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { MeshStandardMaterial, type Group } from 'three';
import { useBikeMaterials } from './materials';
import { createLiveryTexture } from './livery';

/**
 * MotoGP RS-GP26 estilizada, construida con geometrías primitivas.
 * Eje delantero hacia delante (+X), ruedas en el plano XY (eje Z).
 */

interface BikeProps {
  /** Si es true, la rueda no gira (prefers-reduced-motion). */
  reduced: boolean;
}

const FRONT_AXLE: [number, number, number] = [0.9, 0.32, 0];
const REAR_AXLE: [number, number, number] = [-0.85, 0.32, 0];
const FORK_ANGLE = 0.42; // ~24° de avance

export default function Bike({ reduced }: BikeProps) {
  const m = useBikeMaterials();
  const livery = useMemo(() => createLiveryTexture(), []);
  const liveryMat = useMemo(
    () => new MeshStandardMaterial({ map: livery, roughness: 0.35, metalness: 0.15 }),
    [livery],
  );

  const rearWheel = useRef<Group>(null);
  const frontWheel = useRef<Group>(null);

  useEffect(
    () => () => {
      livery.dispose();
      liveryMat.dispose();
    },
    [livery, liveryMat],
  );

  useFrame((_state, delta) => {
    if (reduced) return;
    const spin = Math.min(delta, 0.1) * 9;
    if (rearWheel.current) rearWheel.current.rotation.z -= spin;
    if (frontWheel.current) frontWheel.current.rotation.z -= spin;
  });

  return (
    <group>
      {/* ------------------------------- RUEDAS ------------------------------ */}
      <group ref={rearWheel} position={REAR_AXLE}>
        <mesh material={m.tire}>
          <torusGeometry args={[0.245, 0.075, 14, 42]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.rim}>
          <cylinderGeometry args={[0.185, 0.185, 0.09, 24]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 12]} />
        </mesh>
        <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} material={m.brake}>
          <cylinderGeometry args={[0.115, 0.115, 0.012, 24]} />
        </mesh>
      </group>

      <group ref={frontWheel} position={FRONT_AXLE}>
        <mesh material={m.tire}>
          <torusGeometry args={[0.245, 0.075, 14, 42]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.rim}>
          <cylinderGeometry args={[0.185, 0.185, 0.09, 24]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 12]} />
        </mesh>
        <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]} material={m.brake}>
          <cylinderGeometry args={[0.16, 0.16, 0.012, 24]} />
        </mesh>
        <mesh position={[0, 0, -0.055]} rotation={[Math.PI / 2, 0, 0]} material={m.brake}>
          <cylinderGeometry args={[0.16, 0.16, 0.012, 24]} />
        </mesh>
      </group>

      {/* ------------------------------ HORQUILLA ---------------------------- */}
      {[0.09, -0.09].map((z) => (
        <mesh key={`fork-${z}`} position={[0.76, 0.64, z]} rotation={[0, 0, FORK_ANGLE]} material={m.gold}>
          <cylinderGeometry args={[0.026, 0.026, 0.78, 12]} />
        </mesh>
      ))}
      {[0.09, -0.09].map((z) => (
        <mesh key={`slider-${z}`} position={[0.84, 0.5, z]} rotation={[0, 0, FORK_ANGLE]} material={m.metal}>
          <cylinderGeometry args={[0.037, 0.037, 0.4, 12]} />
        </mesh>
      ))}
      <mesh position={[0.62, 0.96, 0]} rotation={[0, 0, FORK_ANGLE]} material={m.metal}>
        <boxGeometry args={[0.06, 0.1, 0.26]} />
      </mesh>

      {/* ------------------------------ MANILLAR ----------------------------- */}
      <mesh position={[0.57, 1.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.016, 0.016, 0.56, 10]} />
      </mesh>
      {[0.22, -0.22].map((z) => (
        <mesh key={`grip-${z}`} position={[0.57, 1.03, z]} rotation={[Math.PI / 2, 0, 0]} material={m.seat}>
          <cylinderGeometry args={[0.026, 0.026, 0.12, 10]} />
        </mesh>
      ))}

      {/* -------------------------- CARENADO / FRONTAL ----------------------- */}
      {/* Nariz aerodinámica */}
      <mesh position={[0.7, 0.86, 0]} rotation={[0, 0, -0.12]} scale={[1.5, 1, 0.85]} material={m.body}>
        <sphereGeometry args={[0.2, 28, 18]} />
      </mesh>
      {/* Pantalla */}
      <mesh position={[0.55, 1.03, 0]} scale={[0.75, 0.55, 0.7]} material={m.glass}>
        <sphereGeometry args={[0.16, 20, 14]} />
      </mesh>
      {/* Carenado lateral principal */}
      <RoundedBox args={[1.2, 0.52, 0.44]} radius={0.12} smoothness={4} position={[0.2, 0.64, 0]} rotation={[0, 0, 0.05]} material={m.body} />
      {/* Panza */}
      <RoundedBox args={[0.9, 0.3, 0.34]} radius={0.1} smoothness={4} position={[-0.1, 0.32, 0]} material={m.body} />
      {/* Depósito */}
      <RoundedBox args={[0.6, 0.28, 0.36]} radius={0.1} smoothness={4} position={[0.05, 0.9, 0]} rotation={[0, 0, -0.1]} material={m.body} />
      {/* Asiento */}
      <RoundedBox args={[0.32, 0.08, 0.2]} radius={0.03} smoothness={3} position={[-0.25, 0.92, 0]} material={m.seat} />
      {/* Cola ascendente */}
      <RoundedBox args={[0.6, 0.18, 0.24]} radius={0.06} smoothness={4} position={[-0.5, 0.88, 0]} rotation={[0, 0, -0.22]} material={m.body} />

      {/* ------------------------------- MOTOR -------------------------------- */}
      <RoundedBox args={[0.55, 0.42, 0.34]} radius={0.05} smoothness={3} position={[0, 0.45, 0]} material={m.metal} />

      {/* ------------------------------ BASCULANTE ---------------------------- */}
      {[0.11, -0.11].map((z) => (
        <RoundedBox
          key={`swing-${z}`}
          args={[0.75, 0.1, 0.05]}
          radius={0.02}
          smoothness={3}
          position={[-0.55, 0.35, z]}
          material={m.metal}
        />
      ))}

      {/* ------------------------------- ESCAPE ------------------------------- */}
      <mesh position={[-0.1, 0.22, 0.14]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
        <cylinderGeometry args={[0.045, 0.045, 0.9, 12]} />
      </mesh>
      <mesh position={[-0.62, 0.42, 0.16]} rotation={[0, 0, Math.PI / 2 - 0.3]} material={m.chrome}>
        <cylinderGeometry args={[0.06, 0.065, 0.42, 14]} />
      </mesh>
      <mesh position={[-0.83, 0.49, 0.16]} rotation={[0, 0, Math.PI / 2 - 0.3]} material={m.carbon}>
        <cylinderGeometry args={[0.05, 0.055, 0.03, 14]} />
      </mesh>

      {/* ------------------------------ ALERONES ------------------------------ */}
      {[0.26, -0.26].map((z) => (
        <RoundedBox
          key={`wing-${z}`}
          args={[0.3, 0.02, 0.18]}
          radius={0.008}
          smoothness={3}
          position={[0.6, 0.66, z]}
          rotation={[0, 0, -0.1]}
          material={m.carbon}
        />
      ))}
      {[0.26, -0.26].map((z) => (
        <RoundedBox
          key={`wing-accent-${z}`}
          args={[0.28, 0.008, 0.04]}
          radius={0.003}
          smoothness={2}
          position={[0.6, 0.675, z]}
          rotation={[0, 0, -0.1]}
          material={m.accent}
        />
      ))}
      {/* Alerón de cola */}
      {[0.13, -0.13].map((z) => (
        <RoundedBox
          key={`tail-wing-${z}`}
          args={[0.16, 0.015, 0.1]}
          radius={0.005}
          smoothness={2}
          position={[-0.6, 0.95, z]}
          material={m.carbon}
        />
      ))}

      {/* ---------------------- LIVERY "72" EN EL CARENADO -------------------- */}
      {[0.235, -0.235].map((z) => (
        <mesh
          key={`plate-${z}`}
          position={[0.18, 0.68, z]}
          rotation={[0, z > 0 ? 0 : Math.PI, 0.05]}
          material={liveryMat}
        >
          <planeGeometry args={[0.36, 0.32]} />
        </mesh>
      ))}

      {/* Detalle naranja en la panza */}
      <RoundedBox args={[0.5, 0.05, 0.36]} radius={0.02} smoothness={2} position={[-0.1, 0.47, 0]} material={m.accentDark} />
    </group>
  );
}
