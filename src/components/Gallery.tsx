import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import { GALLERY, type GalleryItem } from '../data/content';
import { startScroll, stopScroll } from '../lib/scroll';
import { Reveal, SectionHeading } from './SectionHeading';
import MagneticButton from './MagneticButton';

/* ---------------------------------------------------------------------------
 * Galería: carrusel "coverflow" 3D con CSS transforms (framer-motion) y
 * lightbox accesible. Toda la atribución (autor · licencia) procede de
 * `GALLERY` en src/data/content — nada duplicado a mano.
 * ------------------------------------------------------------------------ */

/** Posición de un slide según su distancia al índice activo. */
function slideVariant(distance: number): TargetAndTransition {
  const abs = Math.min(Math.abs(distance), 3);
  const dir = Math.sign(distance);
  return {
    x: `${dir * abs * 36}%`,
    scale: Math.max(0.58, 1 - abs * 0.14),
    rotateY: -dir * Math.min(abs, 2) * 32,
    opacity: abs === 0 ? 1 : Math.max(0.18, 0.6 - (abs - 1) * 0.22),
    filter:
      abs === 0
        ? 'brightness(1) saturate(1)'
        : `brightness(${Math.max(0.4, 0.72 - (abs - 1) * 0.16)}) saturate(0.85)`,
  };
}

function ChevronIcon({ flipped = false }: { flipped?: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-5 w-5 ${flipped ? 'rotate-180' : ''}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function Gallery(): ReactElement {
  const reduced = useReducedMotion() ?? false;
  const count = GALLERY.length;

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const clickTimer = useRef(0);

  const active: GalleryItem = GALLERY[index];

  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  const openLightbox = useCallback((i: number, trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    setIndex(i);
    setOpen(true);
  }, []);

  const markFailed = useCallback((id: string) => {
    setFailed((prevFailed) => (prevFailed[id] ? prevFailed : { ...prevFailed, [id]: true }));
  }, []);

  /* Limpia el temporizador del swipe al desmontar. */
  useEffect(() => () => window.clearTimeout(clickTimer.current), []);

  /* Bloqueo de scroll (Lenis + fallback nativo) mientras el lightbox está abierto. */
  useEffect(() => {
    if (!open) return undefined;
    stopScroll();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      startScroll();
    };
  }, [open]);

  /* Foco: al abrir va al botón de cerrar; al cerrar vuelve al disparador. */
  useEffect(() => {
    if (!open) return undefined;
    closeBtnRef.current?.focus();
    return () => {
      const trigger = triggerRef.current;
      if (trigger && trigger.isConnected) trigger.focus();
    };
  }, [open]);

  /* ESC cierra y las flechas navegan mientras el lightbox está abierto. */
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, next, prev]);

  /* Navegación por teclado cuando el carrusel tiene foco. */
  const onCarouselKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prev();
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(count - 1);
    }
  };

  /* Swipe táctil / arrastre con puntero. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick.current = true;
      window.clearTimeout(clickTimer.current);
      clickTimer.current = window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      if (dx < 0) next();
      else prev();
    }
  };

  /* Focus trap básico dentro del diálogo (cicla entre sus controles). */
  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>('a[href], button');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <section id="galeria" className="section scroll-mt-24" aria-label="Galería de fotos de Marco Bezzecchi">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="container-x relative">
        <SectionHeading
          eyebrow="Imágenes"
          title="Galería"
          subtitle="Fotografías de carreras con licencia libre, cortesía de Wikimedia Commons."
          align="center"
        />

        <Reveal className="mt-12">
          <div
            role="region"
            aria-roledescription="carrusel"
            aria-label="Galería de fotos de Marco Bezzecchi"
            tabIndex={0}
            onKeyDown={onCarouselKeyDown}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointerStart.current = null;
            }}
            className="relative overflow-x-hidden h-[360px] touch-pan-y select-none [perspective:1200px] sm:h-[440px] md:h-[500px]"
          >
            {GALLERY.map((item, i) => {
              /* Distancia circular al índice activo: las fotos envuelven a ambos
                 lados (coverflow simétrico) en lugar de apilarse de un solo lado. */
              const half = count >> 1;
              const distance = ((((i - index) + half) % count) + count) % count - half;
              const abs = Math.abs(distance);
              const isActive = abs === 0;

              return (
                <div
                  key={item.id}
                  className="absolute inset-y-0 left-1/2 w-[80vw] max-w-[560px] -translate-x-1/2 sm:w-[520px]"
                  style={{ zIndex: 30 - Math.min(abs, 3) }}
                >
                  <motion.div
                    className="h-full"
                    style={{ transformStyle: 'preserve-3d' }}
                    initial={false}
                    animate={slideVariant(distance)}
                    transition={{ duration: reduced ? 0 : 0.55, ease: 'easeOut' }}
                  >
                    <div className="glass glow-border relative h-full overflow-hidden rounded-2xl">
                      <button
                        type="button"
                        tabIndex={isActive ? 0 : -1}
                        aria-label={
                          isActive
                            ? `Ampliar foto: ${item.caption}`
                            : `Ver foto ${i + 1} de ${count}: ${item.caption}`
                        }
                        aria-current={isActive ? 'true' : undefined}
                        onClick={(event) => {
                          if (suppressClick.current) return;
                          if (isActive) openLightbox(i, event.currentTarget);
                          else goTo(i);
                        }}
                        className="absolute inset-0 h-full w-full"
                      >
                        {failed[item.id] ? (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-carbon-2 to-ink p-6 text-center">
                            <span className="eyebrow">Imagen no disponible</span>
                            <span className="font-display text-lg text-mist">{item.caption}</span>
                            <span className="font-cond text-sm text-ash">
                              Foto: {item.author} · {item.license}
                            </span>
                          </span>
                        ) : (
                          <img
                            src={item.src}
                            alt={item.alt}
                            loading="lazy"
                            decoding="async"
                            onError={() => markFailed(item.id)}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </button>

                      {/* Atribución obligatoria visible en cada slide (texto plano:
                          el enlace interactivo vive en la leyenda de abajo para no
                          solaparse con el botón de la foto y romper WCAG 2.5.8). */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 pt-10">
                        <p className="font-cond text-xs text-mist sm:text-sm">
                          {item.author} · {item.license}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Leyenda de la foto activa */}
          <div className="mt-8 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
              >
                <p className="font-cond text-xl text-mist sm:text-2xl">
                  {active.caption} <span className="num text-ash">· {active.year}</span>
                </p>
                <p className="mt-1 text-sm text-ash">
                  Foto:{' '}
                  <a
                    href={active.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mist underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent"
                  >
                    {active.author} <span className="text-ash">· {active.license}</span>
                    <span className="sr-only"> (Wikimedia Commons, se abre en una pestaña nueva)</span>
                  </a>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controles */}
          <div className="mt-6 flex items-center justify-center gap-3 sm:gap-5">
            <MagneticButton
              onClick={prev}
              aria-label="Foto anterior"
              strength={0.35}
              className="glass rounded-full p-3 text-mist transition-colors hover:bg-accent/10 hover:text-accent"
            >
              <ChevronIcon flipped />
            </MagneticButton>

            <ul className="flex items-center gap-2">
              {GALLERY.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Ver foto ${i + 1} de ${count}`}
                    aria-current={i === index ? 'true' : undefined}
                    className="group px-1 py-2"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all ${
                        i === index ? 'w-7 bg-accent' : 'w-3 bg-line group-hover:bg-ash'
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>

            <p className="num font-cond min-w-[3.25rem] text-sm text-ash" aria-hidden="true">
              <span className="text-mist">{index + 1}</span> / {count}
            </p>

            <MagneticButton
              onClick={next}
              aria-label="Foto siguiente"
              strength={0.35}
              className="glass rounded-full p-3 text-mist transition-colors hover:bg-accent/10 hover:text-accent"
            >
              <ChevronIcon />
            </MagneticButton>
          </div>

          <p className="sr-only" aria-live="polite">
            Foto {index + 1} de {count}: {active.caption}
          </p>
        </Reveal>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-md"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: 'easeOut' }}
            onClick={() => setOpen(false)}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="galeria-lightbox-caption"
              data-lenis-prevent
              onClick={(event) => event.stopPropagation()}
              onKeyDown={onDialogKeyDown}
              className="glass glow-border relative w-full max-w-4xl overflow-hidden rounded-2xl p-3 sm:p-5"
            >
              <img
                src={active.srcLarge}
                alt={active.alt}
                decoding="async"
                className="mx-auto max-h-[60vh] w-auto rounded-xl object-contain"
              />

              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p id="galeria-lightbox-caption" className="font-cond text-lg text-mist sm:text-xl">
                    {active.caption} <span className="num text-ash">· {active.year}</span>
                  </p>
                  <p className="mt-1 text-sm text-ash">
                    Foto:{' '}
                    <a
                      href={active.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mist underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent"
                    >
                      {active.author} · {active.license}
                      <span className="sr-only"> — Wikimedia Commons (se abre en una pestaña nueva)</span>
                    </a>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <MagneticButton
                    onClick={prev}
                    aria-label="Foto anterior"
                    strength={0.35}
                    className="glass rounded-full p-2.5 text-mist transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <ChevronIcon flipped />
                  </MagneticButton>
                  <MagneticButton
                    onClick={next}
                    aria-label="Foto siguiente"
                    strength={0.35}
                    className="glass rounded-full p-2.5 text-mist transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <ChevronIcon />
                  </MagneticButton>
                  <MagneticButton
                    ref={closeBtnRef}
                    onClick={() => setOpen(false)}
                    aria-label="Cerrar vista ampliada"
                    className="glass rounded-full p-2.5 text-mist transition-colors hover:bg-accent hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </MagneticButton>
                </div>
              </div>

              <p className="num font-cond mt-3 text-right text-xs text-ash" aria-hidden="true">
                {index + 1} / {count}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
