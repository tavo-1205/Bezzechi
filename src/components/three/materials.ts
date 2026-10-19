import { useEffect, useMemo } from 'react';
import { MeshPhysicalMaterial, MeshStandardMaterial, type Texture } from 'three';
import { createBrakeDiscTexture, createCarbonTexture, createRubberTexture } from './textures';

/** Paleta del equipo (misma que el tema de la landing). */
const ACCENT = '#ff4d00';
const ACCENT_DARK = '#dc3c00';
const ACCENT_LIGHT = '#ff8a3d';

export interface BikeMaterials {
  /** Carenado/depósito: pintura negra con clearcoat sobre fibra oscura. */
  body: MeshPhysicalMaterial;
  /** Acentos naranja Racing (brillo ligero). */
  accent: MeshStandardMaterial;
  /** Naranja oscuro para piezas grandes. */
  accentDark: MeshStandardMaterial;
  /** Naranja claro para filos y aros finos. */
  accentLight: MeshStandardMaterial;
  /** Fibra de carbono satinada (alerones, guardabarros, colín). */
  carbon: MeshPhysicalMaterial;
  /** Aluminio oscuro mecanizado (motor, basculante, chasis). */
  metal: MeshStandardMaterial;
  /** Titanio/cromo del escape. */
  chrome: MeshStandardMaterial;
  /** Horquilla invertida y piezas anodizadas doradas. */
  gold: MeshStandardMaterial;
  /** Caucho de los neumáticos. */
  tire: MeshStandardMaterial;
  /** Asiento y puños. */
  seat: MeshStandardMaterial;
  /** Llantas forjadas. */
  rim: MeshStandardMaterial;
  /** Disco de freno perforado (acero). */
  brake: MeshStandardMaterial;
  /** Pinzas y portadiscos anodizados. */
  caliper: MeshStandardMaterial;
  /** Latiguillos, cables y cadena. */
  hose: MeshStandardMaterial;
  /** Pantalla aerodinámica. */
  glass: MeshPhysicalMaterial;
}

/**
 * Materiales compartidos de la moto, memoizados y dispose() al desmontar.
 * Se apoyan en texturas procedurales de canvas (sin HDR ni assets externos) y
 * en el `<Environment>` local de la escena para las reflexiones.
 */
export function useBikeMaterials(): BikeMaterials {
  const { materials, textures } = useMemo(() => {
    // Tejido grueso para la pintura (se ve sobre todo en los brillos) y fino
    // para las piezas de fibra vista.
    const paintWeave = createCarbonTexture(3.5);
    const carbonWeave = createCarbonTexture(9);
    const rubber = createRubberTexture(4.5);
    const disc = createBrakeDiscTexture(1);

    const materials: BikeMaterials = {
      body: new MeshPhysicalMaterial({
        color: '#e2e2e8',
        map: paintWeave,
        metalness: 0.45,
        roughness: 0.21,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.35,
      }),
      accent: new MeshStandardMaterial({
        color: ACCENT,
        metalness: 0.35,
        roughness: 0.28,
        emissive: ACCENT,
        emissiveIntensity: 0.22,
        envMapIntensity: 1.1,
      }),
      accentDark: new MeshStandardMaterial({
        color: ACCENT_DARK,
        metalness: 0.45,
        roughness: 0.4,
      }),
      accentLight: new MeshStandardMaterial({
        color: ACCENT_LIGHT,
        metalness: 0.3,
        roughness: 0.3,
        emissive: ACCENT_LIGHT,
        emissiveIntensity: 0.18,
      }),
      carbon: new MeshPhysicalMaterial({
        color: '#dadade',
        map: carbonWeave,
        metalness: 0.25,
        roughness: 0.42,
        clearcoat: 0.85,
        clearcoatRoughness: 0.22,
        envMapIntensity: 1.1,
      }),
      metal: new MeshStandardMaterial({
        color: '#33343c',
        metalness: 1,
        roughness: 0.32,
        envMapIntensity: 1.25,
      }),
      chrome: new MeshStandardMaterial({
        color: '#a6a9b4',
        metalness: 1,
        roughness: 0.2,
        envMapIntensity: 1.5,
      }),
      gold: new MeshStandardMaterial({
        color: '#c69a3e',
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.4,
      }),
      tire: new MeshStandardMaterial({
        color: '#ffffff',
        map: rubber,
        metalness: 0,
        roughness: 0.95,
        envMapIntensity: 0.6,
      }),
      seat: new MeshStandardMaterial({
        color: '#141419',
        metalness: 0.05,
        roughness: 0.9,
      }),
      rim: new MeshStandardMaterial({
        color: '#3c3d46',
        metalness: 0.95,
        roughness: 0.28,
        envMapIntensity: 1.3,
      }),
      brake: new MeshStandardMaterial({
        color: '#ffffff',
        map: disc,
        metalness: 0.95,
        roughness: 0.42,
        envMapIntensity: 1.2,
      }),
      caliper: new MeshStandardMaterial({
        color: '#2a2b31',
        metalness: 0.85,
        roughness: 0.35,
        envMapIntensity: 1.2,
      }),
      hose: new MeshStandardMaterial({
        color: '#101014',
        metalness: 0.15,
        roughness: 0.75,
      }),
      glass: new MeshPhysicalMaterial({
        color: '#14141c',
        metalness: 0,
        roughness: 0.06,
        transparent: true,
        opacity: 0.38,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
    };

    const textures: Texture[] = [paintWeave, carbonWeave, rubber, disc];
    return { materials, textures };
  }, []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
    [materials, textures],
  );

  return materials;
}
