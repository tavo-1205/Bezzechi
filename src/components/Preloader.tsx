/**
 * Preloader — semáforo de salida MotoGP (CONTRACTS §4.1).
 *
 * Secuencia con movimiento normal:
 *   rojo → rojo + doble ámbar → verde (≈ 2,2 s en total) →
 *   1) document.documentElement.dataset.preloader = 'done'
 *   2) window.dispatchEvent(new CustomEvent('preloader:done'))
 *   3) overlay con fade-out y desmontaje del DOM (nunca bloquea el foco).
 *
 * GESTIÓN DE AUDIO: los navegadores bloquean el audio hasta que el usuario
 * interactúa con la página. Por eso la secuencia NO arranca sola: se muestra un
 * botón «ENTRAR» y, al pulsarlo, se ejecuta la secuencia del semáforo y se
 * reproduce el arranque del motor (`playEngineRev`) justo cuando las 5 luces se
 * apagan. Ese clic es el gesto que desbloquea el AudioContext. Si el usuario
 * entra sin pulsar (recarga, movimiento reducido), la página funciona sin sonido.
 *
 * Garantías:
 *   - Se dispara exactamente 1 vez (bandera `emitted`).
 *   - Timeout de seguridad a 4 s: la página nunca queda bloqueada.
 *   - `prefers-reduced-motion`: sin secuencia ni sonido; atributo + evento en el
 *     primer render y overlay retirado al instante.
 *
 * NOTA: el Director lo monta en App.tsx (Ronda 2). Este componente es
 * autocontenido y no depende de ningún otro archivo del rediseño.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { isEngineMuted, playEngineRev, preloadEngineAudio, setEngineMuted } from '../lib/engineSound';

const SAFETY_MS = 6000; // timeout de seguridad: nunca bloquea la página

const STAGE_AMBER_MS = 700; // se encienden los dos ámbar (el rojo permanece)
const STAGE_GREEN_MS = 1400; // se enciende el verde
const EMIT_DONE_MS = 1900; // se emite `preloader:done` en verde (salida)
const FADE_MS = 700; // duración del fade-out antes de retirarse del DOM

type Stage = 'idle' | 'red' | 'amber' | 'green';

const STAGE_LABEL: Record<Stage, string> = {
  idle: 'En espera de salida',
  red: 'Rojo',
  amber: 'Rojo y ámbar',
  green: 'Verde',
};

export default function Preloader(): ReactElement | null {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [stage, setStage] = useState<Stage>(reduced ? 'green' : 'idle');
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [muted, setMuted] = useState<boolean>(() => isEngineMuted());

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

  /**
   * Arranca la secuencia del semáforo y, en el instante en que se emite la
   * salida (las 5 luces se apagan), reproduce el arranque del motor.
   */
  const startSequence = (withSound: boolean): void => {
    clearTimers();
    setStage('red');
    timers.current.push(window.setTimeout(() => setStage('amber'), STAGE_AMBER_MS));
    timers.current.push(window.setTimeout(() => setStage('green'), STAGE_GREEN_MS));
    timers.current.push(
      window.setTimeout(() => {
        // Las 5 luces se apagan aquí (salida): arranca el motor.
        if (withSound && !isEngineMuted()) playEngineRev();
        emitDone();
      }, EMIT_DONE_MS),
    );
  };

  /** Clic en «ENTRAR»: gesto del usuario → desbloquea el audio y arranca todo. */
  const handleEnter = (): void => {
    startSequence(true);
  };

  const toggleMute = (): void => {
    setMuted((prev) => {
      const next = !prev;
      setEngineMuted(next);
      return next;
    });
  };

  // Precarga la grabación real mientras el usuario mira el semáforo: así, al
  // pulsar ENTRAR, suena la moto de verdad en lugar de la síntesis de respaldo.
  // Solo descarga y decodifica; no reproduce nada ni depende de un gesto.
  useEffect(() => {
    if (reduced || isEngineMuted()) return undefined;
    preloadEngineAudio();
    return undefined;
  }, [reduced]);

  // El botón flotante (SoundToggle) comparte la preferencia: se mantiene en síncrono.
  useEffect(() => {
    const sync = (): void => setMuted(isEngineMuted());
    window.addEventListener('engine:muted-change', sync);
    return () => window.removeEventListener('engine:muted-change', sync);
  }, []);

  useEffect(() => {
    if (reduced) {
      // Sin secuencia ni sonido: atributo + evento en el primer render.
      document.documentElement.dataset.preloader = 'done';
      window.dispatchEvent(new CustomEvent('preloader:done'));
      setMounted(false);
      return undefined;
    }

    // Timeout de seguridad: aunque el usuario no pulse ENTRAR o falle la
    // secuencia, la página se desbloquea (sin sonido, no hubo gesto).
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

        {stage === 'idle' ? (
          <div className="flex flex-col items-center gap-3">
            <button type="button" onClick={handleEnter} className="x-enter-btn" autoFocus>
              <span className="x-enter-btn__text">Entrar</span>
            </button>
            <p className="max-w-xs text-xs leading-relaxed text-ash">
              Pulsa para arrancar. El motor sonará al apagarse el semáforo.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            className="x-mute-btn"
            aria-label={muted ? 'Activar sonido del motor' : 'Silenciar sonido del motor'}
          >
            {muted ? '🔇 Sonido apagado' : '🔊 Sonido activado'}
          </button>
        )}

        <span role="status" aria-live="polite" className="sr-only">
          Semáforo: {STAGE_LABEL[stage]}
        </span>
      </div>

      {/* Marca de agua: firma discreta en la esquina, integrada en la estética
          (condensada, mayúsculas, muy espaciada, opacidad baja). Decorativa. */}
      <p className="x-preloader__mark" aria-hidden="true">
        <span className="x-preloader__mark-tick" />
        Hecho por Gustavo Blanchar
      </p>
    </div>
  );
}
