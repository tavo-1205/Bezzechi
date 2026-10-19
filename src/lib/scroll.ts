import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Scroll suave (Lenis) + integración con GSAP ScrollTrigger.
 * Se inicializa una sola vez desde App.tsx y se destruye al desmontar.
 * El resto de componentes puede usar stopScroll()/startScroll() (p. ej. el
 * lightbox de la galería) sin importar App.tsx.
 *
 * CONTRACTS §4.1 (preloader): Lenis nace DETENIDO y solo arranca cuando
 * Preloader emite `preloader:done` (o si `dataset.preloader === 'done'`
 * ya al montar). Mientras esté bloqueado, scrollToSection() es un no-op y
 * startScroll() no puede forzarlo. Un timeout de seguridad (4,5 s) desbloquea
 * aunque el evento nunca llegue.
 */

let lenis: Lenis | null = null;
/** true entre el montaje y `preloader:done` (CONTRACTS §4.1). */
let locked = false;
/** El lightbox (u otro dueño) paró el scroll de forma externa. */
let externallyStopped = false;

/** Safety más generoso que el del Preloader (4 s) para no desbloquear antes aún. */
const UNLOCK_SAFETY_MS = 4500;

export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || lenis) return () => undefined;

  gsap.registerPlugin(ScrollTrigger);

  const instance = new Lenis({
    duration: 1.05,
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });
  lenis = instance;
  externallyStopped = false;

  // ── Puerta del preloader (§4.1) ─────────────────────────────────────────
  locked = true;
  instance.stop();

  let gateClosed = false;
  const finished = (): void => {
    if (gateClosed) return;
    gateClosed = true;
    window.clearTimeout(safetyId);
    locked = false;
    // Si el lightbox abrió antes de desbloquear, respeta su stop externo.
    if (!externallyStopped) instance.start();
  };
  const safetyId = window.setTimeout(finished, UNLOCK_SAFETY_MS);
  const onPreloaderDone = (): void => finished();
  if (document.documentElement.dataset.preloader === 'done') finished();
  else window.addEventListener('preloader:done', onPreloaderDone, { once: true });

  instance.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gatedOff();
    gsap.ticker.remove(tick);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };

  /** Retira el listener del preloader y el safety al destruir. */
  function gatedOff(): void {
    gateClosed = true;
    window.clearTimeout(safetyId);
    window.removeEventListener('preloader:done', onPreloaderDone);
    locked = false;
  }
}

export function stopScroll(): void {
  externallyStopped = true;
  lenis?.stop();
}

export function startScroll(): void {
  externallyStopped = false;
  // Bloqueado por el preloader: el desbloqueo lo hará `finished()`.
  if (locked) return;
  lenis?.start();
}

export function scrollToSection(id: string): void {
  // Contrato §4.1: nada de scroll mientras el semáforo siga en rojo/ámbar.
  if (locked) return;
  const target = document.getElementById(id);
  if (!target) return;
  if (lenis) {
    lenis.scrollTo(target, { offset: -70, duration: 1.1 });
    return;
  }
  // Sin Lenis (p. ej. movimiento reducido): nunca animar si el usuario lo pide.
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

export function getLenis(): Lenis | null {
  return lenis;
}
