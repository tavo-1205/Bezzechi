import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { MeshPhysicalMaterial, type Group } from 'three';
import { useBikeMaterials, type BikeMaterials } from './materials';
import { createLiveryTexture } from './livery';

/**
 * MotoGP RS-GP26 estilizada, construida con geometrías primitivas.
 * Eje delantero hacia delante (+X), ruedas en el plano XY (eje Z).
 * La derecha del piloto es +Z (escape); la cadena va a la izquierda (−Z).
 *
 * H3.1: materiales con clearcoat (pintura, fibra, caucho, acero del disco) y
 * detalles de close-up: discos perforados con portadiscos, pinzas radiales,
 * horquilla anodizada, escape con aro de acento, cadena, amortiguador con
 * muelle y estriberas. En móvil se omiten los detalles más pequeños
 * (`detailed={false}`) para no gastar draw calls.
 */

interface BikeProps {
  /** Si es true, la rueda no gira (prefers-reduced-motion). */
  reduced: boolean;
  /** Detalle alto (radios, muelle trasero…). Se desactiva en móvil. */
  detailed?: boolean;
}

interface PartsProps {
  m: BikeMaterials;
  detailed: boolean;
}

const FRONT_AXLE: [number, number, number] = [0.9, 0.32, 0];
const REAR_AXLE: [number, number, number] = [-0.85, 0.32, 0];
const FORK_ANGLE = 0.42; // ~24° de avance
const SPOKE_ANGLES = [0, 1.257, 2.513, 3.77, 5.027];
const SHOCK_ANGLE = 0.428;
const SHOCK_BOTTOM: [number, number] = [-0.74, 0.37];
const COIL_OFFSETS = [0.07, 0.13, 0.19, 0.25, 0.31, 0.37];

/** Llanta forjada de 5 radios + tuerca de eje. */
function WheelRim({ m, detailed, nutSide }: PartsProps & { nutSide: number }) {
  return (
    <>
      <mesh material={m.rim}>
        <torusGeometry args={[0.15, 0.031, 12, 40]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.052, 0.052, 0.11, 16]} />
      </mesh>
      {detailed &&
        SPOKE_ANGLES.map((angle) => (
          <RoundedBox
            key={`spoke-${angle}`}
            args={[0.12, 0.055, 0.042]}
            radius={0.012}
            smoothness={2}
            position={[Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, 0]}
            rotation={[0, 0, angle]}
            material={m.rim}
          />
        ))}
      <mesh position={[0, 0, nutSide * 0.075]} rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <cylinderGeometry args={[0.023, 0.023, 0.022, 6]} />
      </mesh>
    </>
  );
}

/** Disco perforado + portadiscos (acero y aluminio anodizado). */
function BrakeDisc({ z, radius, m }: { z: number; radius: number; m: BikeMaterials }) {
  return (
    <group position={[0, 0, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.brake}>
        <cylinderGeometry args={[radius, radius, 0.011, 32]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
        <cylinderGeometry args={[radius * 0.44, radius * 0.44, 0.018, 20]} />
      </mesh>
    </group>
  );
}

/** Pinza radial (dos pastillas + cuerpo + placa de acento). */
function Caliper({ z, m }: { z: number; m: BikeMaterials }) {
  const sign = z > 0 ? 1 : -1;
  return (
    <group position={[-0.168, 0, z]}>
      <RoundedBox args={[0.07, 0.22, 0.062]} radius={0.022} smoothness={3} material={m.caliper} />
      <RoundedBox
        args={[0.052, 0.016, 0.068]}
        radius={0.006}
        smoothness={2}
        position={[-0.022, -0.062, 0]}
        material={m.accent}
      />
      <RoundedBox
        args={[0.055, 0.19, 0.012]}
        radius={0.004}
        smoothness={2}
        position={[0.032, 0, sign * 0.014]}
        material={m.carbon}
      />
    </group>
  );
}

export default function Bike({ reduced, detailed = true }: BikeProps) {
  const m = useBikeMaterials();
  const livery = useMemo(() => createLiveryTexture(), []);
  const liveryMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: livery,
        roughness: 0.34,
        metalness: 0.2,
        clearcoat: 0.9,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.15,
      }),
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
          <torusGeometry args={[0.245, 0.075, 18, 48]} />
        </mesh>
        <WheelRim m={m} detailed={detailed} nutSide={1} />
        <BrakeDisc z={0.058} radius={0.115} m={m} />
        {/* Pinza trasera, abajo */}
        <group position={[0.01, -0.165, 0.058]}>
          <RoundedBox args={[0.13, 0.075, 0.062]} radius={0.022} smoothness={3} material={m.caliper} />
          <RoundedBox
            args={[0.1, 0.014, 0.068]}
            radius={0.005}
            smoothness={2}
            position={[0, -0.03, 0]}
            material={m.accent}
          />
        </group>
      </group>

      <group ref={frontWheel} position={FRONT_AXLE}>
        <mesh material={m.tire}>
          <torusGeometry args={[0.245, 0.075, 18, 48]} />
        </mesh>
        <WheelRim m={m} detailed={detailed} nutSide={1} />
        <BrakeDisc z={0.055} radius={0.16} m={m} />
        <BrakeDisc z={-0.055} radius={0.16} m={m} />
        <Caliper z={0.055} m={m} />
        <Caliper z={-0.055} m={m} />
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
      {/* Portapinzas de las botellas */}
      {[0.055, -0.055].map((z) => (
        <RoundedBox
          key={`mount-${z}`}
          args={[0.09, 0.11, 0.03]}
          radius={0.012}
          smoothness={3}
          position={[0.79, 0.4, z]}
          rotation={[0, 0, FORK_ANGLE]}
          material={m.metal}
        />
      ))}
      {/* Tija + tapones de precarga */}
      <RoundedBox args={[0.07, 0.06, 0.27]} radius={0.014} smoothness={3} position={[0.6, 0.99, 0]} rotation={[0, 0, FORK_ANGLE]} material={m.metal} />
      {[0.09, -0.09].map((z) => (
        <mesh key={`cap-${z}`} position={[0.6, 1.03, z]} rotation={[0, 0, FORK_ANGLE]} material={m.gold}>
          <cylinderGeometry args={[0.028, 0.028, 0.03, 12]} />
        </mesh>
      ))}

      {/* ------------------------------ MANILLAR ----------------------------- */}
      <mesh position={[0.57, 1.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.016, 0.016, 0.56, 10]} />
      </mesh>
      {[0.22, -0.22].map((z) => (
        <mesh key={`grip-${z}`} position={[0.57, 1.03, z]} rotation={[Math.PI / 2, 0, 0]} material={m.seat}>
          <cylinderGeometry args={[0.026, 0.026, 0.12, 10]} />
        </mesh>
      ))}
      {/* Manetas de freno (+Z) y embrague (−Z) */}
      {[0.25, -0.25].map((z) => (
        <group key={`lever-${z}`} position={[0.65, 1.02, z]} rotation={[0, z > 0 ? -0.32 : 0.32, 0.1]}>
          <RoundedBox args={[0.2, 0.016, 0.026]} radius={0.007} smoothness={2} position={[0.08, 0, 0]} material={m.metal} />
          <RoundedBox args={[0.05, 0.018, 0.028]} radius={0.006} smoothness={2} position={[0.19, 0, 0]} material={m.accent} />
        </group>
      ))}
      {/* Bomba de freno delantera */}
      <mesh position={[0.6, 1.06, 0.19]} rotation={[0, 0, 0.2]} material={m.metal}>
        <cylinderGeometry args={[0.022, 0.022, 0.06, 10]} />
      </mesh>

      {/* -------------------------- CARENADO / FRONTAL ----------------------- */}
      {/* Nariz aerodinámica */}
      <mesh position={[0.7, 0.86, 0]} rotation={[0, 0, -0.12]} scale={[1.5, 1, 0.85]} material={m.body}>
        <sphereGeometry args={[0.2, 28, 18]} />
      </mesh>
      {/* Filo de acento en la nariz */}
      <RoundedBox args={[0.03, 0.02, 0.3]} radius={0.006} smoothness={2} position={[0.88, 0.9, 0]} rotation={[0, 0, -0.12]} material={m.accent} />
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
      {/* Tapón de combustible */}
      <mesh position={[0.02, 1.03, 0]} material={m.gold}>
        <cylinderGeometry args={[0.04, 0.042, 0.018, 16]} />
      </mesh>
      {/* Asiento */}
      <RoundedBox args={[0.32, 0.08, 0.2]} radius={0.03} smoothness={3} position={[-0.25, 0.92, 0]} material={m.seat} />
      {/* Cola ascendente */}
      <RoundedBox args={[0.6, 0.18, 0.24]} radius={0.06} smoothness={4} position={[-0.5, 0.88, 0]} rotation={[0, 0, -0.22]} material={m.body} />

      {/* Franjas del livery a lo largo del carenado y la cola */}
      {[0.232, -0.232].map((z) => (
        <mesh key={`stripe-${z}`} position={[0.3, 0.5, z]} material={m.accent}>
          <boxGeometry args={[0.62, 0.02, 0.006]} />
        </mesh>
      ))}
      {[0.232, -0.232].map((z) => (
        <mesh key={`stripe-light-${z}`} position={[0.3, 0.465, z]} material={m.accentLight}>
          <boxGeometry args={[0.5, 0.008, 0.006]} />
        </mesh>
      ))}
      {[0.115, -0.115].map((z) => (
        <RoundedBox
          key={`tail-stripe-${z}`}
          args={[0.34, 0.014, 0.02]}
          radius={0.004}
          smoothness={2}
          position={[-0.5, 0.93, z]}
          rotation={[0, 0, -0.22]}
          material={m.accent}
        />
      ))}

      {/* ------------------------------- MOTOR -------------------------------- */}
      <RoundedBox args={[0.55, 0.42, 0.34]} radius={0.05} smoothness={3} position={[0, 0.45, 0]} material={m.metal} />
      {/* Tapa de embrague con aro de acento */}
      {[0.175, -0.175].map((z) => (
        <group key={`case-${z}`} position={[-0.1, 0.45, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.caliper}>
            <cylinderGeometry args={[0.11, 0.11, 0.03, 20]} />
          </mesh>
          <mesh position={[0, 0, (z > 0 ? 1 : -1) * 0.018]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
            <torusGeometry args={[0.105, 0.006, 6, 24]} />
          </mesh>
        </group>
      ))}

      {/* --------------------- BASCULANTE + AMORTIGUADOR ---------------------- */}
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
      {/* Amortiguador trasero con muelle */}
      <mesh
        position={[-0.66, 0.545, 0.065]}
        rotation={[0, 0, -SHOCK_ANGLE]}
        material={m.hose}
      >
        <cylinderGeometry args={[0.022, 0.022, 0.42, 12]} />
      </mesh>
      {detailed &&
        COIL_OFFSETS.map((t) => (
          <mesh
            key={`coil-${t}`}
            position={[
              SHOCK_BOTTOM[0] + Math.sin(SHOCK_ANGLE) * t,
              SHOCK_BOTTOM[1] + Math.cos(SHOCK_ANGLE) * t,
              0.065,
            ]}
            rotation={[0, 0, -SHOCK_ANGLE]}
            material={m.gold}
          >
            <torusGeometry args={[0.055, 0.011, 8, 20]} />
          </mesh>
        ))}

      {/* --------------------------- TRANSMISIÓN ------------------------------ */}
      {/* Piñón, cadena y corona (lado izquierdo) */}
      <mesh position={[-0.05, 0.42, -0.14]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 14]} />
      </mesh>
      <mesh position={[-0.85, 0.32, -0.15]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
        <cylinderGeometry args={[0.052, 0.052, 0.032, 12]} />
      </mesh>
      <mesh position={[-0.85, 0.32, -0.15]} material={m.gold}>
        <torusGeometry args={[0.105, 0.014, 8, 32]} />
      </mesh>
      <mesh position={[-0.45, 0.4525, -0.148]} rotation={[0, 0, 0.069]} material={m.hose}>
        <boxGeometry args={[0.8, 0.026, 0.026]} />
      </mesh>
      <mesh position={[-0.45, 0.2875, -0.148]} rotation={[0, 0, 0.179]} material={m.hose}>
        <boxGeometry args={[0.81, 0.026, 0.026]} />
      </mesh>

      {/* ------------------------------- ESCAPE ------------------------------- */}
      <mesh position={[-0.1, 0.22, 0.14]} rotation={[0, 0, Math.PI / 2]} material={m.chrome}>
        <cylinderGeometry args={[0.045, 0.045, 0.9, 12]} />
      </mesh>
      <mesh position={[-0.62, 0.42, 0.16]} rotation={[0, 0, Math.PI / 2 - 0.3]} material={m.chrome}>
        <cylinderGeometry args={[0.06, 0.065, 0.42, 14]} />
      </mesh>
      {/* Aro de acento en la salida */}
      <mesh position={[-0.79, 0.47, 0.16]} rotation={[0, 0, Math.PI / 2 - 0.3]} material={m.accent}>
        <torusGeometry args={[0.062, 0.009, 8, 20]} />
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

      {/* ------------------- GUARDABARROS + ESTRIBERAS ----------------------- */}
      <RoundedBox args={[0.44, 0.028, 0.26]} radius={0.014} smoothness={3} position={[0.92, 0.665, 0]} rotation={[0, 0, 0.05]} material={m.carbon} />
      {[0.13, -0.13].map((z) => (
        <RoundedBox
          key={`fender-${z}`}
          args={[0.2, 0.02, 0.06]}
          radius={0.008}
          smoothness={2}
          position={[0.95, 0.62, z]}
          rotation={[0, 0, 0.55]}
          material={m.carbon}
        />
      ))}
      <RoundedBox args={[0.36, 0.026, 0.2]} radius={0.012} smoothness={3} position={[-1.02, 0.52, 0]} rotation={[0, 0, 0.6]} material={m.carbon} />
      {[0.19, -0.19].map((z) => (
        <group key={`peg-${z}`} position={[-0.7, 0.36, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
            <cylinderGeometry args={[0.014, 0.014, 0.1, 10]} />
          </mesh>
          <mesh position={[0, 0, z > 0 ? 0.055 : -0.055]} rotation={[Math.PI / 2, 0, 0]} material={m.accent}>
            <cylinderGeometry args={[0.017, 0.017, 0.016, 10]} />
          </mesh>
        </group>
      ))}

      {/* ---------------------- LIVERY "72" EN EL CARENADO -------------------- */}
      {[0.235, -0.235].map((z) => (
        <mesh
          key={`plate-${z}`}
          position={[0.18, 0.68, z]}
          rotation={[0, z > 0 ? 0 : Math.PI, 0.05]}
          material={liveryMat}
        >
          <planeGeometry args={[0.34, 0.28]} />
        </mesh>
      ))}

      {/* Detalle naranja en la panza */}
      <RoundedBox args={[0.5, 0.05, 0.36]} radius={0.02} smoothness={2} position={[-0.1, 0.47, 0]} material={m.accentDark} />
    </group>
  );
}
