import { useEffect, useState } from 'react';

/**
 * Tramos de composición del hero (media queries reales, no "móvil sí/no").
 *
 * El hero tenía dos puestas en escena (< 768 px y ≥ 768 px) y a anchos
 * intermedios el titular gigante y la moto se pisaban: a 800 px el `h1` mide
 * 720 px (todo el ancho útil) mientras la moto está compuesta a la derecha.
 * Por eso el tramo intermedio tiene composición propia:
 *
 * - `phone`            → < 768 px (móvil; sin cambios).
 * - `compact`          → 768–1100 px apaisado (tablet apaisada / portátil).
 * - `compact-portrait` → 768–1100 px en pie (tablet vertical). El lienzo es
 *   estrecho, así que la moto necesita más distancia y más desplazamiento.
 * - `wide`             → > 1100 px (escritorio ancho; sin cambios).
 *
 * Las cuatro queries son mutuamente excluyentes y agotan el ancho, así que el
 * orden de evaluación no altera el resultado (la última es el caso por defecto).
 */
export type HeroTier = 'phone' | 'compact' | 'compact-portrait' | 'wide';

const COMPACT_RANGE = '(min-width: 768px) and (max-width: 1100px)';

const TIERS: ReadonlyArray<readonly [HeroTier, string]> = [
  ['phone', '(max-width: 767px)'],
  ['compact', `${COMPACT_RANGE} and (orientation: landscape)`],
  ['compact-portrait', COMPACT_RANGE], // `portrait` incluye también el cuadrado exacto
  ['wide', '(min-width: 1101px)'],
];

/** Tramo por defecto si no hay `matchMedia` (SSR/prerender). */
const FALLBACK: HeroTier = 'wide';

function resolve(lists: MediaQueryList[]): HeroTier {
  for (let i = 0; i < lists.length; i += 1) {
    if (lists[i].matches) return TIERS[i][0];
  }
  return FALLBACK;
}

function readTier(): HeroTier {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return FALLBACK;
  return resolve(TIERS.map(([, query]) => window.matchMedia(query)));
}

/** `true` en el tramo intermedio (768–1100 px), apaisado o en pie. */
export function isCompactTier(tier: HeroTier): boolean {
  return tier === 'compact' || tier === 'compact-portrait';
}

/**
 * Tramo de composición actual. Se lee de forma síncrona en el primer render
 * (nada de parpadeo con la cámara equivocada) y se actualiza con:
 *
 * - `change` de un `MediaQueryList` por tramo: solo dispara al cruzar un límite
 *   real, que es justo cuando cambia la composición;
 * - `resize` como red de seguridad (zoom del navegador, barras de scroll que
 *   aparecen/desaparecen), rAF-throttled para no evaluar por evento.
 *
 * Ambas rutas pasan por el mismo `commit`, que **solo** llama a `setState` si el
 * tramo ha cambiado: un `resize` que no cruza ningún límite no re-renderiza el
 * hero (ni, por tanto, la escena 3D). Los listeners y el rAF se liberan en el
 * cleanup, que React ejecuta siempre antes del siguiente efecto y al desmontar.
 */
export function useHeroTier(): HeroTier {
  const [tier, setTier] = useState<HeroTier>(readTier);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const lists = TIERS.map(([, query]) => window.matchMedia(query));
    let frame = 0;

    const commit = (): void => {
      frame = 0;
      const next = resolve(lists);
      // Actualización funcional + identidad: React descarta el render si el
      // tramo no ha cambiado (evita re-renders en cascada al redimensionar).
      setTier((current) => (current === next ? current : next));
    };
    const schedule = (): void => {
      if (!frame) frame = window.requestAnimationFrame(commit);
    };

    commit();
    for (const list of lists) list.addEventListener('change', schedule);
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      for (const list of lists) list.removeEventListener('change', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return tier;
}
