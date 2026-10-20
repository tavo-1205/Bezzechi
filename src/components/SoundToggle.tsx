/**
 * SoundToggle — control de sonido del motor, VISIBLE y PERSISTENTE.
 *
 * El preloader ya ofrece un botón de silencio durante la salida, pero se
 * desmonta al terminar. Este control flotante acompaña al usuario durante toda
 * la navegación y comparte la misma preferencia (`localStorage['bz72:engine-muted']`
 * vía `src/lib/engineSound`), de modo que ambos botones quedan siempre en síncrono.
 *
 * Con `prefers-reduced-motion` no aparece: en ese modo el motor nunca suena.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { isEngineMuted, setEngineMuted } from '../lib/engineSound';

export default function SoundToggle(): ReactElement | null {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [muted, setMuted] = useState<boolean>(() => isEngineMuted());
  // Aparece tras el preloader: durante la portada no se solapa con el semáforo.
  const [ready, setReady] = useState<boolean>(
    () => typeof document !== 'undefined' && document.documentElement.dataset.preloader === 'done',
  );

  // Los dos botones de silencio (preloader y este) comparten preferencia: sin
  // este evento, uno podría quedar desincronizado del otro.
  useEffect(() => {
    const sync = (): void => setMuted(isEngineMuted());
    window.addEventListener('engine:muted-change', sync);
    return () => window.removeEventListener('engine:muted-change', sync);
  }, []);

  useEffect(() => {
    const onDone = (): void => setReady(true);
    window.addEventListener('preloader:done', onDone, { once: true });
    return () => window.removeEventListener('preloader:done', onDone);
  }, []);

  // El override `?motion=full` puede activarse en caliente; se reconsulta.
  useEffect(() => {
    const mq =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    if (!mq) return undefined;
    const onChange = (): void => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (reduced || !ready) return null;

  const toggle = (): void => {
    const next = !muted;
    setEngineMuted(next);
    setMuted(next);
    window.dispatchEvent(new CustomEvent('engine:muted-change', { detail: { muted: next } }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={muted}
      className="x-sound-toggle"
      title={muted ? 'Activar sonido del motor' : 'Silenciar sonido del motor'}
      aria-label={muted ? 'Activar sonido del motor' : 'Silenciar sonido del motor'}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}
