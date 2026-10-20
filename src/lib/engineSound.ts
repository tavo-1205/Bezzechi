/**
 * Sonido de motor MotoGP generado con Web Audio API — sin archivos externos
 * (cero peso de bundle, cero problemas de licencia).
 *
 * Diseño del sonido (2,6 s, arranque + aceleración que se desvanece):
 *   - 2 osciladores `sawtooth` (el segundo desafinado +7 cents) con rampa de
 *     frecuencia 80 Hz → 600 Hz: da el «cuerpo» armónico del motor.
 *   - 1 oscilador `square` una octava arriba y a bajo volumen: el filo metálico.
 *   - Ruido blanco por un `BiquadFilter` **bandpass** cuya frecuencia sube con el
 *     régimen y cuya Q baja: es el rugido de admisión/escape.
 *   - `BiquadFilter` **lowpass** con rampa de corte (700 Hz → 3200 Hz) que abre
 *     conforme sube el régimen, más una segunda rampa de cierre al final.
 *   - Envolvente de volumen: ataque rápido (arranque), meseta, y caída larga
 *     que se desvanece al entrar a la página.
 *
 * Reglas de accesibilidad y de navegador:
 *   - El `AudioContext` se crea **dentro del manejador del clic** (política de
 *     autoplay): si se creara al cargar, quedaría `suspended` y no sonaría.
 *   - Se gestiona el estado `suspended` con `resume()`.
 *   - No suena si el usuario ha silenciado (localStorage) ni con
 *     `prefers-reduced-motion`.
 *   - Todo el trabajo pesado (buffer de ruido) se cachea entre llamadas.
 */

const MUTE_KEY = 'bz72:engine-muted';
const MAX_GAIN = 0.4;
const DURATION = 2.6;

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

/** ¿El usuario ha silenciado el motor? Nunca rompe si localStorage no está. */
export function isEngineMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Guarda la preferencia de silencio (try/catch: modo privado, storage lleno…). */
export function setEngineMuted(muted: boolean): void {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch {
    /* sin persistencia: la preferencia dura solo esta sesión */
  }
  // Notifica a los controles montados (preloader + botón flotante) para que
  // ambos reflejen el estado al instante.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('engine:muted-change', { detail: { muted } }));
  }
}

/** ¿Está el usuario pidiendo menos movimiento? */
function reducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Devuelve (creando si hace falta) el AudioContext. SIEMPRE llamar desde un
 * manejador de gesto del usuario para que el navegador lo deje sonar.
 */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** Buffer de ruido blanco cacheado (2 s es de sobra para el rugido). */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/**
 * Reproduce el arranque y la aceleración de un motor de MotoGP.
 *
 * @returns `true` si el sonido se ha lanzado, `false` si se ha omitido
 *          (silenciado, movimiento reducido o Web Audio no disponible).
 */
export function playEngineRev(): boolean {
  if (isEngineMuted() || reducedMotion()) return false;

  const ctx = getContext();
  if (!ctx) return false;

  // El contexto puede nacer o quedar `suspended` (política de autoplay).
  if (ctx.state === 'suspended') void ctx.resume();

  const now = ctx.currentTime;
  const end = now + DURATION;

  // ── Bus de salida con la ganancia máxima controlada ──────────────────────
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.connect(ctx.destination);

  // ── Filtro pasa-bajos general (abre con el régimen, cierra al final) ─────
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.9;
  lowpass.frequency.setValueAtTime(700, now);
  lowpass.frequency.exponentialRampToValueAtTime(3200, now + 1.5);
  lowpass.frequency.exponentialRampToValueAtTime(600, end);
  lowpass.connect(master);

  /**
   * Envolvente común: ataque (arranque), meseta con aceleración y caída larga
   * que se desvanece al entrar en la página.
   */
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(MAX_GAIN, now + 0.12);
  master.gain.setValueAtTime(MAX_GAIN, now + 1.6);
  master.gain.exponentialRampToValueAtTime(0.0001, end);

  // ── Osciladores de motor ────────────────────────────────────────────────
  // Rampa de régimen: sube en dos tramos (arranque y aceleración plena).
  const revCurve: Array<[number, number]> = [
    [now, 80],
    [now + 0.18, 220],
    [now + 0.5, 340],
    [now + 1.4, 600],
    [now + 1.9, 520],
    [end, 260],
  ];

  const makeOsc = (
    type: OscillatorType,
    detune: number,
    gainValue: number,
    ratio: number,
  ): OscillatorNode => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    revCurve.forEach(([t, f]) => {
      osc.frequency.setValueAtTime(f * ratio, t);
    });
    const g = ctx.createGain();
    g.gain.value = gainValue;
    osc.connect(g);
    g.connect(lowpass);
    osc.start(now);
    osc.stop(end);
    return osc;
  };

  // Dos sierras (una desafinada para dar cuerpo) + un cuadrado una octava arriba.
  makeOsc('sawtooth', 0, 0.5, 1);
  makeOsc('sawtooth', 7, 0.44, 1.004);
  makeOsc('square', -5, 0.16, 2);

  // ── Rugido: ruido filtrado en banda (admisión/escape) ───────────────────
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  noise.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.setValueAtTime(1.4, now);
  band.Q.linearRampToValueAtTime(0.7, now + 1.5);
  band.frequency.setValueAtTime(180, now);
  band.frequency.exponentialRampToValueAtTime(1800, now + 1.4);
  band.frequency.exponentialRampToValueAtTime(400, end);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.15);
  noiseGain.gain.setValueAtTime(0.22, now + 1.5);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, end);

  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(lowpass);
  noise.start(now);
  noise.stop(end);

  // Limpieza: al terminar, se desconecta el bus (no se acumulan nodos).
  window.setTimeout(
    () => {
      try {
        master.disconnect();
        lowpass.disconnect();
      } catch {
        /* ya desconectado */
      }
    },
    Math.ceil((DURATION + 0.4) * 1000),
  );

  return true;
}

/** Cierra el AudioContext (útil al desmontar el preloader). */
export function closeEngineAudio(): void {
  if (!audioCtx) return;
  try {
    void audioCtx.close();
  } catch {
    /* ya cerrado */
  }
  audioCtx = null;
}
