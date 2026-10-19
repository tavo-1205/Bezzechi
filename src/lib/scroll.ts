import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Scroll suave (Lenis) + integración con GSAP ScrollTrigger.
 * Se inicializa una sola vez desde App.tsx y se destruye al desmontar.
 * El resto de componentes puede usar stopScroll()/startScroll() (p. ej. el
 * lightbox de la galería) sin importar App.tsx.
 */

let lenis: Lenis | null = null;

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

  instance.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

export function stopScroll(): void {
  lenis?.stop();
}

export function startScroll(): void {
  lenis?.start();
}

export function scrollToSection(id: string): void {
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
