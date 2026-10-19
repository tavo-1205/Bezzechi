import { useEffect, useMemo } from 'react';
import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

/** Paleta del equipo (misma que el tema de la landing). */
const ACCENT = '#ff4d00';
const ACCENT_DARK = '#dc3c00';

export interface BikeMaterials {
  /** Carenado principal: negro carbón con clearcoat. */
  body: MeshPhysicalMaterial;
  /** Acentos naranja Racing. */
  accent: MeshStandardMaterial;
  /** Rojo-naranja más oscuro (detalles). */
  accentDark: MeshStandardMaterial;
  /** Estructura / alerones en negro mate. */
  carbon: MeshStandardMaterial;
  /** Aluminio oscuro (motor, basculante, horquilla baja). */
  metal: MeshStandardMaterial;
  /** Escape cromado. */
  chrome: MeshStandardMaterial;
  /** Horquilla invertida dorada. */
  gold: MeshStandardMaterial;
  /** Neumáticos. */
  tire: MeshStandardMaterial;
  /** Asiento. */
  seat: MeshStandardMaterial;
  /** Llantas. */
  rim: MeshStandardMaterial;
  /** Discos de freno. */
  brake: MeshStandardMaterial;
  /** Pantalla. */
  glass: MeshPhysicalMaterial;
}

/**
 * Materiales compartidos de la moto, memoizados y dispose() al desmontar.
 */
export function useBikeMaterials(): BikeMaterials {
  const materials = useMemo<BikeMaterials>(
    () => ({
      body: new MeshPhysicalMaterial({
        color: '#0d0d11',
        metalness: 0.55,
        roughness: 0.26,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      accent: new MeshStandardMaterial({
        color: ACCENT,
        metalness: 0.4,
        roughness: 0.3,
        emissive: ACCENT,
        emissiveIntensity: 0.25,
      }),
      accentDark: new MeshStandardMaterial({
        color: ACCENT_DARK,
        metalness: 0.5,
        roughness: 0.35,
      }),
      carbon: new MeshStandardMaterial({
        color: '#101014',
        metalness: 0.3,
        roughness: 0.62,
      }),
      metal: new MeshStandardMaterial({
        color: '#2e2e36',
        metalness: 0.95,
        roughness: 0.35,
      }),
      chrome: new MeshStandardMaterial({
        color: '#b9b9c4',
        metalness: 1,
        roughness: 0.18,
      }),
      gold: new MeshStandardMaterial({
        color: '#c39a45',
        metalness: 1,
        roughness: 0.25,
      }),
      tire: new MeshStandardMaterial({
        color: '#0a0a0c',
        metalness: 0,
        roughness: 0.92,
      }),
      seat: new MeshStandardMaterial({
        color: '#17171c',
        metalness: 0.1,
        roughness: 0.85,
      }),
      rim: new MeshStandardMaterial({
        color: '#45454f',
        metalness: 0.9,
        roughness: 0.3,
      }),
      brake: new MeshStandardMaterial({
        color: '#7a7a85',
        metalness: 0.9,
        roughness: 0.4,
      }),
      glass: new MeshPhysicalMaterial({
        color: '#1a1a22',
        metalness: 0,
        roughness: 0.05,
        transparent: true,
        opacity: 0.4,
        clearcoat: 1,
      }),
    }),
    [],
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  return materials;
}
