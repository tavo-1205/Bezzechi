import { useEffect, useState } from 'react';

/**
 * Hook mínimo y responsive-safe para detectar un media query (p. ej. móvil).
 * El valor inicial se calcula de forma síncrona para evitar el primer render
 * incorrecto de la cámara 3D.
 */
export function useBreakpoint(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
