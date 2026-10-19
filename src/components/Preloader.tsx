/**
 * Preloader — semáforo de salida MotoGP (CONTRACTS §4.1).
 *
 * Secuencia con movimiento normal:
 *   rojo → rojo + doble ámbar → verde (≈ 2,2 s en total) →
 *   1) document.documentElement.dataset.preloader = 'done'
 *   2) window.dispatchEvent(new CustomEvent('preloader:done'))
 *   3) overlay con fade-out y desmontaje del DOM (nunca bloquea el foco).
 *
 * Garantías:
 *   - Se dispara exactamente 1 vez (bandera `emitted`).
 *   - Timeout de seguridad a 4 s: la página nunca queda bloqueada.
 *   - `prefers-reduced-motion`: sin secuencia; atributo + evento en el
 *     primer render y overlay retirado al instante.
 *
 * NOTA: el Director lo monta en App.tsx (Ronda 2). Este componente es
 * autocontenido y no depende de ningún otro archivo del rediseño.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

const TOTAL_MS = 2200; // duración aproximada de la secuencia del semáforo
const SAFETY_MS = 4000; // timeout de seguridad: nunca bloquea la página

const STAGE_AMBER_MS = 700; // se encienden los dos ámbar (el rojo permanece)
const STAGE_GREEN_MS = 1400; // se enciende el verde
const EMIT_DONE_MS = 1600; // se emite `preloader:done` en verde
const FADE_MS = 700; // duración del fade-out antes de retirarse del DOM

type Stage = 'red' | 'amber' | 'green';

const STAGE_LABEL: Record<Stage, string> = {
  red: 'Rojo',
  amber: 'Rojo y ámbar',
  green: 'Verde',
};

export default function Preloader(): ReactElement | null {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [stage, setStage] = useState<Stage>('red');
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(true);

  const emitted = useRef(false);
  const timers = useRef<number[]>([]);

  const clearTimers = (): void => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  /** Emite `preloader:done` exactamente una vez y inicia la retirada del overlay. */
  const emitDone = useCallback((): void => {
    if (emitted.current) return;
    emitted.current = true;

    // 1) atributo en <html> (los consumidores lo leen al montar)
    document.documentElement.dataset.preloader = 'done';
    // 2) evento en window (patrón de escucha con { once: true })
    window.dispatchEvent(new CustomEvent('preloader:done'));
    // 3) fade del overlay; al terminar, se desmonta del DOM
    setFading(true);
    timers.current.push(window.setTimeout(() => setMounted(false), FADE_MS));
  }, []);

  const runSequence = (): void => {
    clearTimers();
    setStage('red');
    timers.current.push(window.setTimeout(() => setStage('amber'), STAGE_AMBER_MS));
    timers.current.push(window.setTimeout(() => setStage('green'), STAGE_GREEN_MS));
    timers.current.push(window.setTimeout(emitDone, EMIT_DONE_MS));
    timers.current.push(window.setTimeout(clearTimers, TOTAL_MS));
  };

  useEffect(() => {
    if (reduced) {
      // Sin secuencia: atributo + evento en el primer render, overlay al instante.
      document.documentElement.dataset.preloader = 'done';
      window.dispatchEvent(new CustomEvent('preloader:done'));
      setMounted(false);
      return undefined;
    }

    runSequence();
    // Timeout de seguridad: aunque falle la secuencia, la página se desbloquea.
    timers.current.push(
      window.setTimeout(() => {
        if (!emitted.current) emitDone();
      }, SAFETY_MS),
    );

    return () => clearTimers();
    // `reduced` es estable para la vida de la página; emitDone es estable.
  }, [reduced, emitDone]);

  // Ya no hay nada que mostrar: se retira del DOM para no retener foco ni ARIA.
  if (!mounted) return null;

  const lit = (stageName: Stage): boolean => stage === stageName;
  const redLit = lit('red') || lit('amber') || lit('green');
  const amberLit = lit('amber') || lit('green'); // rojo permanece con los ámbar
  const greenLit = lit('green');

  return (
    <div className={`x-preloader${fading ? ' fading' : ''}`} role="region" aria-label="Semáforo de salida">
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="eyebrow text-accent-300">Semáforo de salida · Marco Bezzecchi #72</p>

        <div className="x-traffic-light" aria-label="Estado del semáforo de salida">
          <div
            aria-hidden="true"
            className={`x-light x-light--red ${redLit ? 'x-light--on x-red' : ''}`}
            data-state={redLit ? 'on' : 'off'}
          />
          <div className="flex gap-1">
            <div
              aria-hidden="true"
              className={`x-light x-light--amberL ${amberLit ? 'x-light--on x-amber' : ''}`}
              data-state={amberLit ? 'on' : 'off'}
            />
            <div
              aria-hidden="true"
              className={`x-light x-light--amberR ${amberLit ? 'x-light--on x-amber' : ''}`}
              data-state={amberLit ? 'on' : 'off'}
            />
          </div>
          <div
            aria-hidden="true"
            className={`x-light x-light--green ${greenLit ? 'x-light--on x-green' : ''}`}
            data-state={greenLit ? 'on' : 'off'}
          />
        </div>

        <span role="status" aria-live="polite" className="sr-only">
          Semáforo: {STAGE_LABEL[stage]}
        </span>
      </div>
    </div>
  );
}
