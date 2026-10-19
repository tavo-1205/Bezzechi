/**
 * Override de movimiento — permite VER las animaciones en equipos que tienen los
 * efectos de animación desactivados a nivel de sistema.
 *
 * Contexto: en Windows, si el ajuste «Efectos de animación» está desactivado
 * (`SPI_GETCLIENTAREAANIMATION = false`, `MinAnimate = 0`), **todos** los
 * navegadores del equipo reportan `prefers-reduced-motion: reduce`, y la web
 * apaga el movimiento a propósito (accesibilidad). En ese caso, o se activa el
 * ajuste del sistema, o se usa este override para ver la web animada.

 * - `?motion=full`   → fuerza el movimiento (se recuerda en `localStorage`).
 * - `?motion=system` → olvida el override y vuelve a respetar el sistema.
 *
 * El override parchea `window.matchMedia` para que cualquier consulta de
 * `prefers-reduced-motion` responda «sin reducir»: afecta por igual a las
 * lecturas propias y a las de las librerías (Framer Motion, GSAP…), sin tocar
 * un solo componente. El lado CSS se resuelve con `html[data-motion="full"]`
 * en `index.css` y `styles/extras.css`.
 */
const STORAGE_KEY = 'bz72:motion';
const REDUCED = 'prefers-reduced-motion';

/** MediaQueryList de mentira: los consumidores solo leen `matches`/`media`. */
function fakeQuery(query: string, matches: boolean): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

function readParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('motion');
  } catch {
    return null;
  }
}

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'full';
  } catch {
    return false;
  }
}

function installMotionOverride(): void {
  if (typeof window === 'undefined') return;

  const param = readParam();
  if (param === 'full' || param === 'system') {
    try {
      if (param === 'full') localStorage.setItem(STORAGE_KEY, 'full');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sin almacenamiento: el override dura solo esta carga */
    }
  }

  const forced = param === 'full' || (param !== 'system' && readStored());
  if (!forced) return;

  document.documentElement.dataset.motion = 'full';

  const nativeMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = ((query: string) => {
    if (query.includes(REDUCED)) return fakeQuery(query, !query.includes('reduce'));
    return nativeQuery(query);
  }) as typeof window.matchMedia;

  function nativeQuery(query: string): MediaQueryList {
    return nativeMatchMedia(query);
  }
}

installMotionOverride();
