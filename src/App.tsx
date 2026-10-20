import { Suspense, lazy, useEffect, useRef, useState, type ReactElement } from 'react';
import { NAV_LINKS } from './data/content';
import { formatLastUpdate, getBezzecchi, useLiveData } from './data/api';
import { initSmoothScroll, scrollToSection } from './lib/scroll';
import { refreshScrollTriggers } from './lib/gsapSetup';
import Preloader from './components/Preloader';
import MagneticButton from './components/MagneticButton';
import ScrollProgress from './components/ScrollProgress';
import SectionBoundary from './components/SectionBoundary';
import SoundToggle from './components/SoundToggle';

/* --------------------------------------------------------------------------
 * Shell de la landing.
 * - Todas las secciones (Hero 3D, Marcador, Timeline, Estadísticas, Calendar,
 *   Gallery y Footer) se cargan en diferido (React.lazy): three.js y Recharts
 *   quedan fuera del bundle principal.
 * - El marcador y la sección de estadísticas usan el mismo store de datos
 *   compartido (useLiveData), con un único polling.
 * ------------------------------------------------------------------------ */

const Hero3D = lazy(() => import('./components/Hero3D'));
const LiveScoreboard = lazy(() => import('./components/LiveScoreboard'));
const Timeline = lazy(() => import('./components/Timeline'));
const CareerStats = lazy(() => import('./components/CareerStats'));
const Calendar = lazy(() => import('./components/Calendar'));
const Gallery = lazy(() => import('./components/Gallery'));
const Footer = lazy(() => import('./components/Footer'));

function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return undefined;

    const html = document.documentElement;
    html.classList.add('has-cursor');

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pointer.x, y: pointer.y };
    let frame = 0;

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      const target = event.target as HTMLElement | null;
      const hot = Boolean(target?.closest('a, button, [role="button"], [data-cursor="hot"]'));
      html.classList.toggle('cursor-hot', hot);
    };

    const loop = () => {
      ring.x += (pointer.x - ring.x) * 0.18;
      ring.y += (pointer.y - ring.y) * 0.18;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      frame = window.requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      html.classList.remove('has-cursor', 'cursor-hot');
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}

function Navbar() {
  const { standings, raceWeekend, lastUpdated } = useLiveData();
  const bezzecchi = getBezzecchi(standings);
  const [active, setActive] = useState<string>('inicio');

  useEffect(() => {
    // Las secciones con carga diferida (Timeline/Calendar/Gallery) aún no existen
    // al montar: reintentamos hasta tener las 6 y acumulamos las visibles para
    // elegir la activa de forma determinista (no solo las del último batch).
    const visible = new Map<string, IntersectionObserverEntry>();
    let observer: IntersectionObserver | null = null;
    let attempts = 0;
    let done = false;

    const pickActive = (): void => {
      let best: IntersectionObserverEntry | null = null;
      for (const entry of visible.values()) {
        if (best === null || entry.intersectionRatio > best.intersectionRatio) best = entry;
      }
      if (best !== null) setActive(best.target.id);
    };

    const trySetup = (): boolean => {
      if (done) return true;
      const sections = NAV_LINKS.map((link) => document.getElementById(link.id)).filter(
        (node): node is HTMLElement => node !== null,
      );
      if (sections.length < NAV_LINKS.length) return false;

      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) visible.set(entry.target.id, entry);
            else visible.delete(entry.target.id);
          });
          pickActive();
        },
        { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.6] },
      );
      sections.forEach((section) => observer?.observe(section));
      done = true;
      return true;
    };

    trySetup();
    const retryId = window.setInterval(() => {
      attempts += 1;
      if (trySetup() || attempts >= 80) window.clearInterval(retryId);
    }, 250);

    return () => {
      window.clearInterval(retryId);
      observer?.disconnect();
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <nav
        aria-label="Navegación principal"
        className="glass glow-border mx-auto flex max-w-6xl items-center gap-3 rounded-full py-2 pr-2 pl-4 md:gap-6 md:pl-6"
      >
        <MagneticButton
          onClick={() => scrollToSection('inicio')}
          strength={0.2}
          className="font-display shrink-0 text-sm font-black tracking-tight text-mist transition-colors hover:text-accent"
        >
          BEZZ<span className="text-accent">72</span>
        </MagneticButton>

        <ul className="no-scrollbar flex flex-1 items-center gap-4 overflow-x-auto text-xs md:gap-5 md:text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.id} className="shrink-0">
              <MagneticButton
                onClick={() => scrollToSection(link.id)}
                strength={0.15}
                aria-current={active === link.id ? 'true' : undefined}
                className={`font-cond whitespace-nowrap px-1 py-1 uppercase tracking-[0.14em] transition-colors ${
                  active === link.id ? 'text-accent' : 'text-ash hover:text-mist'
                }`}
              >
                {link.label}
              </MagneticButton>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 sm:flex">
          {raceWeekend.active ? (
            <span className="font-cond flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
              <span className="live-dot" aria-hidden="true" />
              En vivo
            </span>
          ) : (
            <span className="font-cond num text-xs tracking-[0.2em] text-ash uppercase">
              {bezzecchi ? `${bezzecchi.points} pts · P${bezzecchi.position}` : 'cargando'}
            </span>
          )}
          <span className="sr-only" aria-live="polite">
            Última actualización de datos: {formatLastUpdate(lastUpdated)}
          </span>
        </div>
      </nav>
    </header>
  );
}

/** Fallback mientras se descarga un módulo de sección (carga diferida). */
function SectionFallback({ height = 'h-64' }: { height?: string }): ReactElement {
  return (
    <div className={`container-x ${height}`} aria-hidden="true">
      <div className="skeleton h-full w-full rounded-2xl" />
    </div>
  );
}

/** Fallback del hero: réplica local de HeroSkeleton (evita importar three.js aquí). */
function HeroFallback(): ReactElement {
  return (
    <section id="inicio" className="section relative min-h-screen scroll-mt-24 overflow-hidden py-0" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando la experiencia 3D del hero…
      </p>
      <div className="container-x relative pt-28">
        <div className="skeleton h-3 w-56" aria-hidden="true" />
        <div className="skeleton mt-6 h-14 w-3/4 max-w-2xl md:h-24" aria-hidden="true" />
        <div className="skeleton mt-4 h-14 w-1/2 max-w-xl md:h-24" aria-hidden="true" />
        <div className="skeleton mt-8 h-4 w-72 max-w-full" aria-hidden="true" />
        <div className="skeleton mt-14 h-10 w-36 rounded-full" aria-hidden="true" />
      </div>
      <div
        className="skeleton absolute right-[-10%] bottom-[10%] h-64 w-64 rounded-full opacity-30 md:h-96 md:w-96"
        aria-hidden="true"
      />
    </section>
  );
}

export default function App() {
  useEffect(() => {
    const destroy = initSmoothScroll();
    let resizeTimer = 0;

    // Las secciones son lazy: cuando su chunk monta, el layout cambia. Estos
    // refrescos (fuentes, preloader, imágenes y resize) son los cuatro momentos
    // en que las medidas de ScrollTrigger pueden quedar obsoletas.
    const onFontsReady = () => refreshScrollTriggers();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void document.fonts.ready.then(onFontsReady);
    }
    const onPreloaderDone = () => refreshScrollTriggers();
    window.addEventListener('preloader:done', onPreloaderDone);
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => refreshScrollTriggers(), 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('preloader:done', onPreloaderDone);
      destroy();
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-ink text-mist">
      <a
        href="#marcador"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        Saltar al contenido
      </a>

      <CustomCursor />
      <ScrollProgress />
      <Navbar />
      <Preloader />
      <SoundToggle />

      <main id="main">
        {/* 1 · HERO 3D (carga diferida) */}
        <SectionBoundary name="Portada">
          <Suspense fallback={<HeroFallback />}>
            <Hero3D />
          </Suspense>
        </SectionBoundary>

        {/* 2 · MARCADOR EN VIVO (carga diferida) */}
        <SectionBoundary name="Marcador en vivo">
          <Suspense fallback={<SectionFallback height="h-96" />}>
            <LiveScoreboard />
          </Suspense>
        </SectionBoundary>

        {/* 3 · TRAYECTORIA */}
        <SectionBoundary name="Trayectoria">
          <Suspense fallback={<SectionFallback />}>
            <Timeline />
          </Suspense>
        </SectionBoundary>

        {/* 4 · ESTADÍSTICAS DE CARRERA (carga diferida: Recharts fuera del bundle principal) */}
        <SectionBoundary name="Estadísticas">
          <Suspense fallback={<SectionFallback height="h-[36rem]" />}>
            <CareerStats />
          </Suspense>
        </SectionBoundary>

        {/* 5 · CALENDARIO 2026 */}
        <SectionBoundary name="Calendario">
          <Suspense fallback={<SectionFallback height="h-[32rem]" />}>
            <Calendar />
          </Suspense>
        </SectionBoundary>

        {/* 6 · GALERÍA */}
        <SectionBoundary name="Galería">
          <Suspense fallback={<SectionFallback />}>
            <Gallery />
          </Suspense>
        </SectionBoundary>
      </main>

      <Suspense
        fallback={
          <footer className="border-t border-line/60 py-12">
            <div className="container-x">
              <div className="skeleton h-24 w-full rounded-2xl" aria-hidden="true" />
            </div>
          </footer>
        }
      >
        <Footer />
      </Suspense>
    </div>
  );
}
