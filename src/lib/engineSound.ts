/**
 * Sonido de motor MotoGP generado con Web Audio API — sin archivos externos
 * (cero peso de bundle, cero problemas de licencia).
 *
 * Objetivo: imitar el arranque y el corte de una MotoGP real (Aprilia RS-GP V4
 * de Bezzecchi) de la forma más creíble posible con síntesis. El sonido dura
 * **12 s** y reproduce una salida de boxes completa:
 *
 *   FASE 0 (0,0–0,9 s)  Arranque: motor de arranque (zumbido agudo) + primeras
 *                       explosiones irregulares.
 *   FASE 1 (0,9–2,2 s)  Encendido y ralentí: el V4 «coge» y se estabiliza con
 *                       un lope irregular característico.
 *   FASE 2 (2,2–4,2 s)  Primer golpe de gas: sube de vueltas, corta, cae.
 *   FASE 3 (4,2–7,6 s)  Aceleración a fondo: sube de régimen pasando por 3
 *                       cambios de marcha (cada uno con su caída y su «blip»).
 *   FASE 4 (7,6–9,6 s)  Zona alta: el grito metálico sostenido (red line).
 *   FASE 5 (9,6–11,2 s) Corte y deceleración: baja de vueltas con petardeo.
 *   FASE 6 (11,2–12 s)  Vuelve a ralentí y se desvanece.
 *
 * CADENA DE SÍNTESIS (por qué suena a moto y no a zumbido):
 *   - **Fundamental + armónicos**: 5 dientes de sierra en proporciones 1×, 2×,
 *     3×, 4× y 0,5×, desafinados entre sí (detune) → el timbre rico y «sucio»
 *     de un escape de competición, con batidos.
 *   - **V4 irregular**: un LFO (subaudio) modula la afinación para dar el lope
 *     desigual del encendido en V, en vez del drone perfecto de un sintetizador.
 *   - **Rugido de admisión**: ruido blanco por un `bandpass` cuya frecuencia
 *     sigue al régimen → el «aire» que entra por la caja del filtro.
 *   - **Soplido de escape**: segundo ruido por `highpass` → el siseo cortante.
 *   - **`lowpass` maestro**: abre con el régimen (700 Hz → 5 kHz) y cierra al
 *     cortar el gas → el motor «se abre» al acelerar y se apaga al soltar.
 *   - **Saturación (`WaveShaper`)**: añade armónicos impares y comprime el pico,
 *     el «grano» que distingue un escape real de un tono limpio.
 *   - **Envolvente de régimen** con meseta y caídas en cada cambio de marcha.
 *
 * Reglas de accesibilidad y de navegador:
 *   - El `AudioContext` se crea **dentro del manejador del clic** (política de
 *     autoplay): si se creara al cargar, quedaría `suspended` y no sonaría.
 *   - Se gestiona el estado `suspended` con `resume()`.
 *   - No suena si el usuario ha silenciado (localStorage) ni con
 *     `prefers-reduced-motion`.
 *   - Todo el trabajo pesado (buffer de ruido, curva de saturación) se cachea.
 */

const MUTE_KEY = 'bz72:engine-muted';
const MAX_GAIN = 0.4;
/** Duración total del arranque + corte (mínimo pedido: 10 s). */
export const ENGINE_DURATION = 12;

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let shaperCurve: Float32Array<ArrayBuffer> | null = null;

/** Grabación real de motor ya decodificada (si está disponible). */
let engineBuffer: AudioBuffer | null = null;
/** Evita lanzar varias peticiones simultáneas del archivo. */
let loadingEngine = false;
/** `true` si el archivo no existe/decodifica: no se vuelve a intentar. */
let engineUnavailable = false;

/**
 * Fuentes de la grabación real, en orden de preferencia. El MP3 va primero por
 * compatibilidad universal; el OGG queda como respaldo por si el navegador no
 * soporta MP3 en `decodeAudioData`.
 */
const ENGINE_SOURCES = ['/audio/moto-rev.mp3', '/audio/moto-rev.ogg'] as const;

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

/** Buffer de ruido blanco cacheado (3 s es de sobra para el rugido continuo). */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 3);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/**
 * Curva de saturación suave (tanh) cacheada: añade armónicos impares y comprime
 * los picos → el «grano» metálico del escape. `amount` controla la dureza.
 */
function getShaperCurve(): Float32Array<ArrayBuffer> {
  if (shaperCurve) return shaperCurve;
  const n = 1024;
  const curve = new Float32Array(n);
  const k = 3.2;
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  shaperCurve = curve;
  return curve;
}

/**
 * Reproduce el sonido del motor al apagarse el semáforo.
 *
 * Estrategia en cascada:
 *   1. **Grabación real** (`/audio/moto-rev.{mp3,ogg}`) descargada y decodificada
 *      una sola vez (idealmente ya precargada con `preloadEngineAudio`). Es lo
 *      que de verdad suena a moto.
 *   2. Si el archivo no existe, no carga o el navegador no puede decodificarlo,
 *      se cae a la **síntesis procedural** (`playSynthRev`), que siempre funciona.
 *
 * @returns `true` si el sonido se ha lanzado (o queda lanzándose), `false` si se
 *          ha omitido (silenciado, movimiento reducido o Web Audio no disponible).
 */
export function playEngineRev(): boolean {
  if (isEngineMuted() || reducedMotion()) return false;

  const ctx = getContext();
  if (!ctx) return false;

  // El contexto puede nacer o quedar `suspended` (política de autoplay).
  if (ctx.state === 'suspended') void ctx.resume();

  // Si ya tenemos la grabación decodificada, se reproduce al instante.
  if (engineBuffer) {
    playBuffer(ctx, engineBuffer);
    return true;
  }

  // Primera vez (y el precargado del preloader no llegó a tiempo): se pide el
  // archivo. Mientras llega, la síntesis suena YA (así el usuario nunca oye
  // silencio) y, cuando la grabación está lista, se recuerda para la próxima.
  if (!engineBuffer) void loadEngineBuffer(ctx);

  // Respaldo (o primera reproducción mientras carga la grabación).
  playSynthRev(ctx);
  return true;
}

/**
 * Precarga la grabación real en segundo plano, sin reproducir nada.
 *
 * Se llama al montar el preloader (mientras el usuario mira el semáforo) para
 * que, al pulsar ENTRAR, la grabación ya esté decodificada y suene al instante
 * en lugar de arrancar con la síntesis. Es seguro llamarla varias veces: solo
 * descarga una vez y no crea el `AudioContext` hasta que el usuario interactúa.
 */
export function preloadEngineAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  void loadEngineBuffer(ctx);
}

/**
 * Descarga y decodifica la grabación una sola vez (MP3 y, si falla, OGG).
 * Si ninguna está disponible, marca el audio real como no disponible para no
 * reintentar en cada reproducción.
 */
async function loadEngineBuffer(ctx: AudioContext): Promise<void> {
  if (engineBuffer || loadingEngine || engineUnavailable) return;
  loadingEngine = true;
  try {
    for (const url of ENGINE_SOURCES) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.arrayBuffer();
        engineBuffer = await ctx.decodeAudioData(data);
        return;
      } catch {
        // Se prueba la siguiente fuente (otro formato).
      }
    }
    engineUnavailable = true; // ninguna fuente sirvió: no se reintenta
  } finally {
    loadingEngine = false;
  }
}

/** Reproduce la grabación real con un pequeño realce y desvanecido final. */
function playBuffer(ctx: AudioContext, buffer: AudioBuffer): void {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // Sin desplazamiento: el archivo ya viene recortado al tramo útil.
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const dur = buffer.duration;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.9, now + 0.08);
  gain.gain.setValueAtTime(0.9, now + Math.max(0.1, dur - 1.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + dur + 0.05);
  window.setTimeout(
    () => {
      try {
        gain.disconnect();
      } catch {
        /* ya desconectado */
      }
    },
    Math.ceil((dur + 0.3) * 1000),
  );
}

/**
 * Síntesis procedural del arranque y corte de un motor (respaldo de 12 s).
 * Se usa solo si la grabación real no está disponible.
 *
 * @returns `true` si el sonido se ha lanzado.
 */
function playSynthRev(ctx: AudioContext): boolean {
  const now = ctx.currentTime;
  const end = now + ENGINE_DURATION;

  // ── Curva de régimen (RPM): pico de vueltas × 6000 rpm ──────────────────
  // Recorre arranque → ralentí → dos golpes de gas → aceleración con 3 cambios
  // de marcha → zona alta → corte → vuelta a ralentí.
  // Valores en Hz de la fundamental (el V4 a ~14 000 rpm ≈ 233 Hz).
  const rev: Array<[number, number]> = [
    [now + 0.0, 30], // motor de arranque
    [now + 0.35, 34],
    [now + 0.6, 48], // primeras explosiones
    [now + 0.9, 70], // coge
    [now + 1.3, 74],
    [now + 1.9, 66], // lope de ralentí
    [now + 2.2, 72],
    // Golpe de gas 1
    [now + 2.7, 150],
    [now + 3.2, 190],
    [now + 3.7, 168], // corta
    [now + 4.2, 96],
    // Aceleración a fondo con cambios de marcha
    [now + 4.7, 150],
    [now + 5.1, 205], // 1.ª → 2.ª (caída de régimen)
    [now + 5.4, 170],
    [now + 5.9, 215], // 2.ª → 3.ª
    [now + 6.2, 180],
    [now + 6.8, 228], // 3.ª → 4.ª
    [now + 7.1, 196],
    [now + 7.6, 236], // zona alta (red line)
    [now + 8.4, 240],
    [now + 9.0, 232],
    // Corte y deceleración con petardeo
    [now + 9.6, 190],
    [now + 10.1, 150],
    [now + 10.6, 120],
    [now + 11.1, 92],
    [now + 11.5, 74], // ralentí
    [end, 62],
  ];

  /** Aplica la curva de régimen (× `ratio`) a cualquier AudioParam de frecuencia. */
  const applyRev = (param: AudioParam, ratio: number): void => {
    rev.forEach(([t, f]) => param.setValueAtTime(f * ratio, t));
  };

  // ── Bus de salida con la ganancia máxima controlada ──────────────────────
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // ── Saturación (grano del escape) ────────────────────────────────────────
  const shaper = ctx.createWaveShaper();
  shaper.curve = getShaperCurve();
  shaper.oversample = '4x';
  shaper.connect(master);

  // ── Filtro pasa-bajos maestro: sigue al régimen y cierra al cortar ───────
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 1.1;
  lowpass.frequency.setValueAtTime(600, now);
  lowpass.frequency.exponentialRampToValueAtTime(2600, now + 1.2);
  lowpass.frequency.exponentialRampToValueAtTime(1500, now + 2.2);
  lowpass.frequency.exponentialRampToValueAtTime(5200, now + 7.6); // abre a fondo
  lowpass.frequency.exponentialRampToValueAtTime(5600, now + 9.0);
  lowpass.frequency.exponentialRampToValueAtTime(900, now + 11.3); // cierra al cortar
  lowpass.frequency.exponentialRampToValueAtTime(700, end);
  lowpass.connect(shaper);

  // ── Envolvente maestra: arranque, meseta, corte y desvanecido ────────────
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(MAX_GAIN * 0.55, now + 0.25); // arranque
  master.gain.linearRampToValueAtTime(MAX_GAIN * 0.6, now + 1.1);
  master.gain.linearRampToValueAtTime(MAX_GAIN * 0.55, now + 2.2); // ralentí
  master.gain.linearRampToValueAtTime(MAX_GAIN * 0.85, now + 3.2); // gas
  master.gain.setValueAtTime(MAX_GAIN * 0.8, now + 4.2);
  master.gain.linearRampToValueAtTime(MAX_GAIN, now + 7.6); // a fondo
  master.gain.setValueAtTime(MAX_GAIN, now + 9.4);
  master.gain.linearRampToValueAtTime(MAX_GAIN * 0.7, now + 10.6); // corta
  master.gain.exponentialRampToValueAtTime(0.0001, end); // se desvanece

  // ── Banco de osciladores: fundamental + armónicos (timbre de escape) ─────
  // Las proporciones no enteras (1.004 etc.) generan batidos: el motor «late».
  const partials: Array<{ type: OscillatorType; ratio: number; detune: number; gain: number }> = [
    { type: 'sawtooth', ratio: 0.5, detune: -4, gain: 0.18 }, // subarmónico (cuerpo)
    { type: 'sawtooth', ratio: 1, detune: 0, gain: 0.5 }, // fundamental
    { type: 'sawtooth', ratio: 1.004, detune: 7, gain: 0.42 }, // batido
    { type: 'sawtooth', ratio: 2, detune: -6, gain: 0.3 }, // 2.º armónico
    { type: 'square', ratio: 3, detune: 4, gain: 0.16 }, // 3.º (filo metálico)
    { type: 'sawtooth', ratio: 4, detune: -9, gain: 0.12 }, // 4.º
  ];

  const oscNodes: OscillatorNode[] = [];
  partials.forEach(({ type, ratio, detune, gain }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    applyRev(osc.frequency, ratio);
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(lowpass);
    osc.start(now);
    osc.stop(end);
    oscNodes.push(osc);
  });

  // ── LFO de irregularidad (V4): modula la afinación del banco ────────────
  // Un motor en V no dispara a intervalos iguales; este temblor subaudio da el
  // «lope» característico en vez del drone perfecto de un sintetizador.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(9, now);
  lfo.frequency.linearRampToValueAtTime(26, now + 7.6);
  lfo.frequency.linearRampToValueAtTime(12, end);
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.setValueAtTime(14, now); // ±14 cents en ralentí
  lfoDepth.gain.linearRampToValueAtTime(28, now + 7.6); // ±28 en zona alta
  lfoDepth.gain.linearRampToValueAtTime(16, end);
  lfo.connect(lfoDepth);
  oscNodes.forEach((osc) => lfoDepth.connect(osc.detune));
  lfo.start(now);
  lfo.stop(end);

  // ── Rugido de admisión: ruido por bandpass que sigue al régimen ──────────
  const intake = ctx.createBufferSource();
  intake.buffer = getNoiseBuffer(ctx);
  intake.loop = true;
  const intakeBand = ctx.createBiquadFilter();
  intakeBand.type = 'bandpass';
  intakeBand.Q.setValueAtTime(2.2, now);
  intakeBand.Q.linearRampToValueAtTime(0.8, now + 7.6);
  applyRev(intakeBand.frequency, 9); // el «aire» sube con las revoluciones
  const intakeGain = ctx.createGain();
  intakeGain.gain.setValueAtTime(0.0001, now);
  intakeGain.gain.linearRampToValueAtTime(0.16, now + 0.3);
  intakeGain.gain.linearRampToValueAtTime(0.3, now + 7.6);
  intakeGain.gain.setValueAtTime(0.26, now + 9.4);
  intakeGain.gain.exponentialRampToValueAtTime(0.0001, end);
  intake.connect(intakeBand);
  intakeBand.connect(intakeGain);
  intakeGain.connect(lowpass);
  intake.start(now);
  intake.stop(end);

  // ── Soplido de escape: ruido por highpass → el siseo cortante al acelerar ─
  const hiss = ctx.createBufferSource();
  hiss.buffer = getNoiseBuffer(ctx);
  hiss.loop = true;
  const hissFilter = ctx.createBiquadFilter();
  hissFilter.type = 'highpass';
  hissFilter.frequency.setValueAtTime(900, now);
  hissFilter.frequency.exponentialRampToValueAtTime(2600, now + 7.6);
  hissFilter.frequency.exponentialRampToValueAtTime(800, end);
  const hissGain = ctx.createGain();
  hissGain.gain.setValueAtTime(0.0001, now);
  hissGain.gain.linearRampToValueAtTime(0.05, now + 2.2);
  hissGain.gain.linearRampToValueAtTime(0.14, now + 7.6);
  hissGain.gain.exponentialRampToValueAtTime(0.0001, now + 10.8);
  hiss.connect(hissFilter);
  hissFilter.connect(hissGain);
  hissGain.connect(lowpass);
  hiss.start(now);
  hiss.stop(end);

  // ── Petardeo del escape al cortar (pequeños chasquidos de ruido en banda) ─
  const popTimes = [9.65, 9.95, 10.25, 10.5];
  popTimes.forEach((t) => {
    const pop = ctx.createBufferSource();
    pop.buffer = getNoiseBuffer(ctx);
    const popBand = ctx.createBiquadFilter();
    popBand.type = 'bandpass';
    popBand.frequency.value = 480;
    popBand.Q.value = 1.3;
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0.0001, t);
    popGain.gain.linearRampToValueAtTime(0.28, t + 0.012);
    popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    pop.connect(popBand);
    popBand.connect(popGain);
    popGain.connect(lowpass);
    pop.start(t);
    pop.stop(t + 0.12);
  });

  // ── Limpieza: al terminar, se desconecta el bus (no se acumulan nodos) ───
  window.setTimeout(
    () => {
      try {
        master.disconnect();
        shaper.disconnect();
        lowpass.disconnect();
        lfoDepth.disconnect();
      } catch {
        /* ya desconectado */
      }
    },
    Math.ceil((ENGINE_DURATION + 0.5) * 1000),
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
