# TEAM — rediseño "recorrido por el circuito"

> Léelo ANTES de empezar y actualiza tu fila/estado al terminar cada paso.
> Estados: `pendiente` · `en curso` · `hecho` · `bloqueado`.
> ¿Necesitas tocar un archivo ajeno? → "Solicitudes al Director" y sigue avanzando.

## 1 · Concepto creativo

La landing es **un recorrido por el circuito** en seis tramos:

1. **Semáforo de salida (preloader)** — luces rojo → doble ámbar → verde,
   scroll bloqueado; al verde se emite `preloader:done` (CONTRACTS §4.1).
2. **Salida (Hero 3D)** — la RS-GP26 arranca contigo: escena que reacciona al
   scroll (la cámara "acelera") y al puntero; título con reveal tras el semáforo.
3. **Recta principal (Marcador)** — marcador estilo **cabina de boxes**: cifras
   tipo telemetría, estados EN VIVO / skeleton / error / caché tipo pit-board.
4. **Curvas (Timeline + Estadísticas)** — la moto recorre la línea de tiempo con
   **pin/scrub**; tarjetas con **spotlight + tilt**.
5. **Meta (Calendario)** — cuenta atrás como panel de boxes, estética bandera.
6. **Podio (Galería)** — carrusel **inmersivo** 3D + lightbox; footer de parque
   cerrado.

Global: cursor personalizado (anillo + punto), botones magnéticos, HUD con Barlow
Condensed, barra de progreso tipo circuito.

### 1.1 Criterios de éxito (todos obligatorios para cerrar)

1. `typecheck` y `build` sin errores ni warnings relevantes.
2. Cero errores en la consola del navegador (escritorio y móvil).
3. Lighthouse: accesibilidad > 90 y rendimiento > 80 en escritorio; en móvil,
   simplificar efectos pesados hasta lograrlo.
4. Hero con preloader de semáforo, moto 3D reactiva y tipografía gigante animada.
5. Scroll con pin/scrub, transiciones entre secciones y barra de progreso tipo
   circuito funcionando.
6. Marcador de puntos estilo cabina con animación de cambio y estados de
   carga/error/caché funcionando (`src/data/api.ts` **no se modifica**).
7. Timeline con moto animada, calendario con cuenta atrás, galería inmersiva con
   lightbox, cursor personalizado y botones magnéticos.
8. `prefers-reduced-motion` respetado y responsive real (móvil, tablet, escritorio).
9. El scroll **nunca** queda bloqueado (probar abrir/cerrar el lightbox y el fin
   del preloader).
10. Ninguna sección se ve vacía, rota o con elementos solapados.

## 2 · Equipo

| Rol | Agente | Modelo | Notas |
|---|---|---|---|
| Director/Arquitecto | sesión principal | `big-pickle` | único editor de `App.tsx`/`index.css`/docs; integra y hace commits |
| 3D | `hero3d` | `deepseek-v4.1-flash-free` | pasos H3.1→H3.3 con revisión entre pasos |
| Scroll | `scrollfx` | `glm-5.3-flash-free` | Lenis detenido hasta `preloader:done` |
| UI/Design | `uidesign` | `nemotron-3.5-super-vl-free` | solo `extras.css`; **revisor visual** con capturas al fin de cada ronda |
| Datos en vivo | `livedata` | `mimo-v2.6-flash-free` | `api.ts` intocado |
| QA | `qa` | `beam-free` | typecheck/build/Lighthouse; escribe SOLO en `docs/` |
| Reservas | `general`/`explore` | `longcat-2.5-preview-free`, `space-bunny-free` | si un modelo se bloquea por límite |

## 3 · Reglas

1. Un solo dueño por archivo (§5). Archivo ajeno → "Solicitudes al Director".
2. `npm run typecheck` + `npm run build` en verde antes de decir "hecho"
   (reintentar una vez si el build choca con otro agente compilando).
3. `npm run dev` prohibido para agentes (permiso denegado); lo levanta el Director.
4. `src/data/api.ts` congelado. `src/data/content.ts` solo con solicitud aprobada.
5. Contenido en español; 60 fps; `prefers-reduced-motion` en todo.
6. Actualiza tu fila en §5 y añade una línea en §9 (Bitácora) al terminar.
7. **Git solo lo usa el Director**: hace `git add -A && git commit` antes y
   después de cada ronda. Los agentes no ejecutan git ni borran archivos.

## 4 · Plan de rondas (máx. 3 agentes en paralelo)

| Ronda | Quién | Trabajo | Estado |
|---|---|---|---|
| **0** | Director | `TEAM.md`, `CONTRACTS.md`, `extras.css` conectado, agentes ajustados | **hecho** |
| **1a** | `hero3d` + `uidesign` + `livedata` (3 en paralelo) | H3.1 moto · preloader+tilt+galería · cabina del marcador | en curso |
| **1b** | `scrollfx` (al liberar cupo) + `hero3d` H3.2/H3.3 (serial con revisión) | pin/scrub, moto del timeline, reactividad | pendiente |
| **2** | Director | integrar en `App.tsx`, resolver conflictos, `typecheck`+`build`, commit | pendiente |
| **3** | `qa` | criterios 1-10 + Lighthouse + consola → Incidencias QA en §8 | pendiente |
| **4** | especialistas | correcciones por prioridad (repetir 2→3→4, **máx. 5 iteraciones**) | pendiente |
| **5** | Director + revisor visual | revisión final en navegador (`npm run build` + `preview`), capturas → README + resumen | pendiente |

**Bucle de calidad**: implementar → Director integra (`typecheck`+`build`) → QA
prioriza en §8 (crítica / alta / media) → especialistas corrigen → se repite.
**No se cierra con incidencias críticas o altas abiertas.**

## 5 · Archivos: dueño y estado

| Archivo | Dueño | Estado | Notas |
|---|---|---|---|
| `docs/TEAM.md`, `docs/CONTRACTS.md`, `docs/DECISIONS.md` | Director | **hecho** | Ronda 0 + PASO 0 |
| `src/index.css` | Director | en curso | import de `extras.css` ya hecho |
| `src/styles/extras.css` | uidesign | hecho | clases con prefijo `x-` |
| `App.tsx`, `main.tsx`, `index.html` | Director | pendiente | único integrador |
| `components/Hero3D.tsx`, `components/three/**` | hero3d | hecho | H3.1-H3.3 completos: moto, trazas+glow, reactividad (scroll/puntero/entrada con `preloader:done`) y `MagneticButton` en el CTA (§9 R2) |
| `components/Preloader.tsx` (nuevo) | uidesign | hecho | emisor `preloader:done` |
| `components/TiltCard.tsx`, `SectionHeading.tsx` | uidesign | hecho | primitivas de UI |
| `components/Gallery.tsx`, `Footer.tsx` | uidesign | hecho | conservar a11y del lightbox |
| `components/MagneticButton.tsx` (nuevo) | uidesign | hecho | atracción al puntero (lerp + `translate3d`) |
| `lib/scroll.ts`, `components/Timeline.tsx`, `Calendar.tsx`, `components/ScrollProgress.tsx` (nuevo, sin montar) | scrollfx | en curso | R1b: Lenis detenido hasta `preloader:done` · pin/scrub + moto · `ScrollProgress` pendiente de montar por el Director |
| `components/LiveScoreboard.tsx`, `StatsCharts.tsx`, `CareerStats.tsx` | livedata | en curso | estilo cabina |
| `data/api.ts`, `data/snapshot.json` | — | **congelado** | no editar |
| `data/content.ts` | Director | **congelado** | solo con solicitud aprobada |
| `server/**`, `vite.config.ts`, `scripts/**`, `README.md` | Director | pendiente | README al final |
| `qa` | — | — | solo escribe en `docs/` |

## 6 · Protocolo del Especialista 3D (pasos con revisión)

- **H3.1 Moto**: refinar la moto procedural (materiales, livery #72, neumáticos,
  frenos) → `typecheck`+`build` → línea en §9 → **parar y esperar revisión**.
- **H3.2 Partículas + postprocesado** (bloom ligero solo si el coste de fps lo
  permite) → igual → parar.
- **H3.3 Reactividad** (scroll→cámara, puntero→parallax) + entrada tras
  `preloader:done` → igual → parar.
- El Director revisa cada paso antes de autorizar el siguiente (comentario en §9).

## 7 · Solicitudes al Director

- **[R1a · livedata] RESUELTA:** firma completa de `StatsCharts` (con `compact?`)
  reflejada en CONTRACTS §5.
- **[R1b · scrollfx] RESUELTA:** `ScrollProgress` registrada en CONTRACTS §5 y
  montada en `App.tsx` (tras `<CustomCursor />`) por el Director.
- **[R1b · uidesign] RESUELTA:** `MagneticButton` registrado en CONTRACTS §5 y
  aplicado por el Director en el nav de `App.tsx`.
- Sin solicitudes abiertas.

## 8 · Incidencias QA

_(vacío — formato: prioridad crítica|alta|media · archivo:línea · problema)_

## 9 · Bitácora

- **[R0 · Director]** TEAM.md + CONTRACTS.md creados; `extras.css` importado en
  `index.css`; agentes actualizados (pasos 3D, preloader:done, extras.css, QA).
- **[PASO 0 · Director]** `opencode.json` (permisos V2) y `.gitignore` creados;
  git instalado + repo inicializado; commit `7b75caf "antes del rediseño"`.
- **[R1a · hero3d]** H3.1 hecho: materiales con clearcoat/envMapIntensity
  (pintura, fibra, caucho, acero de disco) + texturas procedurales nuevas
  (`three/textures.ts`: carbono twill, caucho, disco perforado), livery `72` con
  cursiva + BEZZECCHI/APRILIA RACING, y close-ups: discos+portadiscos+pinzas
  radiales (3), llantas de 5 radios, horquilla con portapinzas y tapones de
  precarga, manetas, cadena/corona, amortiguador con muelle, estriberas,
  guardabarros, aros de acento en nariz/escape/cárteres, tapón de combustible y
  contraluz frío; en móvil `detailed={false}` (menos draw calls). Sin tocar
  partículas (H3.2) ni reactividad/entrada (H3.3). `npm run typecheck` y
  `npm run build` en **verde** (build 679 ms; el aviso de chunk `three` >900 kB
  es ajeno a H3.1; un primer build falló por errores TS de `Preloader.tsx`, ya
  corregidos por uidesign). Espero revisión del Director.
- **[R1a · uidesign]** Preloader (semáforo rojo→doble ámbar→verde ≈2,2 s, `preloader:done`
  1 vez, timeout 4 s, reduced-motion instant), TiltCard verificado sin cambios de props,
  SectionHeading con reveal de entrada, Gallery coverflow 3D con lightbox a11y intacta y
  Footer parque cerrado; extras.css con clases `x-`; typecheck + build verdes.
- **[R1a · livedata]** Marcador con acabado pit-board: riel de estado (EN VIVO con
  `live-dot`, chip de procedencia directo/caché/snapshot y `formatLastUpdate` con
  `aria-live`, "Sincronizando…" durante el polling), skeleton con etiqueta HUD,
  panel de error "Sin señal" con reintento, aviso de caché/snapshot diferenciados
  por texto+color, odómetro de posición/puntos y **reordenación animada de la Top 5**
  (`motion.li layout`, anulada con reduced-motion) con fila #72 destacada en accent;
  `StatsCharts` con riel de lectura (cifras `.num`), eje Y en pts, ticks de ejes en
  `.font-cond`+tabular y tooltip sólido AA; `CareerStats` con índice "01/06",
  contraste de bordes, riel de fuente/hora y esqueleto de la gráfica. `api.ts`
  intacto; typecheck + build **verdes**.
- **[R1a · Director]** Integración: `<Preloader />` montado en `App.tsx` (eager,
  tras el skip-link), tokens `signal-red/amber/green` añadidos a `index.css`
  (aprobados), CONTRACTS §5 actualizado (`compact?`) y solicitud de livedata
  cerrada en §7. `typecheck`+`build` verdes y commit `01d8ac7`.
- **[R1a · Director · revisión H3.1]** **Aprobado.** `materials.ts` memoiza y
  libera materiales+texturas (`dispose`), paleta fiel a los tokens, `reduced`
  respetado en ruedas/cámara, `detailed={!mobile}` recorta draw calls en móvil.
  Nota: no hubo revisión **visual** porque el panel del navegador integrado está
  oculto (sin render ni capturas — ver DECISIONS); el canvas del hero se vio
  `hidden` en el DOM. **Autorizado H3.2** (partículas/postprocesado sin
  dependencias nuevas; si hace falta una librería → solicitud en §7).
- **[R1b · hero3d] H3.2 hecho: trazas de velocidad instanciadas + glow aditivo
  (sin librerías nuevas) + a11y del `h1`; typecheck+build verdes. Espero revisión
  del Director.**
  - `three/SpeedParticles.tsx` reescrito: 1 draw call (240 trazas escritorio / 96
    móvil) con `AdditiveBlending` + `toneMapped:false`, `depthWrite:false` y color
    por instancia (mist/ash + acento #ff4d00/`#ff8a3d`); capa "cercana a cámara"
    (22 % de las trazas, z 1,2→3,4, velocidad 11-20) para parallax fuerte sobre la
    capa principal (z −4,6→0,8, velocidad 6-13, alturas sesgadas hacia la moto);
    longitud proporcional a la velocidad (0,65→1,7) y grosor variable; **cero
    allocations por frame** (hash determinista para calles/grosor/brillo y
    `Object3D` memoizado) y reciclado por módulo sobre el carril (±9) que elimina
    los "racimos" del respawn aleatorio anterior; `DynamicDrawUsage` en las matrices.
  - **Postprocesado ligero sin dependencias nuevas**: `three/Glow.tsx` (nuevo) con
    halos y charco de luz aditivos (2 sprites + 1 plano en el asfalto con
    `renderOrder` −1) que fingen bloom de caja; el halo queda ocluido por la
    geometría opaca de la moto y solo se ve alrededor del contorno. Textura
    `createGlowTexture()` nueva en `textures.ts` (degradado radial, `dispose()`
    al desmontar). Pulso lentísimo con `useFrame`; con reduced-motion queda
    congelado en su valor base.
  - `Hero3D.tsx`: espacio real entre los dos spans del `h1` → el nombre accesible pasa
    de "MARCOBEZZECCHI" a "Marco Bezzecchi" (verificado con `renderToStaticMarkup`)
    sin cambio de layout (spans de bloque). `materials.ts` (H3.1) **intacto**.
  - Sin cablear aún `preloader:done` (entrada/arranque = H3.3). `typecheck` y `build`
    en **verde** (build 8,24 s; se mantiene el aviso de chunk `three` >900 kB, ajeno).
    Sin solicitud en §7: no hizo falta ninguna librería.
- **[R1b · uidesign]** `MagneticButton` (nuevo): botón `<button type="button">`
  con atracción al puntero (lerp estilo resorte + `translate3d`, `strength`
  opcional, defecto 0.35); reenvía `className`, `onClick`, `aria-*`, `ref`
  (forwardRef) y el resto de props de botón; desactivado por completo con
  `prefers-reduced-motion: reduce` y `(pointer: coarse)`; vuelve al centro al
  salir del ratón y al recibir foco por teclado sin romper tabulación ni foco
  visible; un handler por evento y cancel de rAF en el unmount. Se aplica en
  `Footer.tsx` ("Volver al inicio") y `Gallery.tsx` (flechas del carrusel y
  botones anterior/siguiente/cerrar del lightbox, conservando la a11y existente).
  `extras.css`: luces del semáforo `.x-light--on` ahora usan los tokens de señal
  `--color-signal-red/amber/green` de CONTRACTS §1 (sin tokens nuevos).
  `typecheck` + build en **verde**.
- **[R1b · scrollfx]** Implementado: Contrato §4.1 en `scroll.ts` (Lenis nace
  detenido; arranca con `preloader:done`/`dataset.preloader` ya `done` o safety
  4,5 s; listener retirado en destroy; `scrollToSection()` no-op bloqueado;
  `startScroll()` respeta el stop externo del lightbox; firmas intactas);
  `Timeline.tsx` con **pin+scrub** (ventana `100svh`, track trasladado con fin
  function-based + `invalidateOnRefresh`, `will-change` solo durante el pin) y
  **moto SVG** que recorre la línea de acento según el progreso del pin; hitos
  revelados vía `containerAnimation` (sincronizados con el recorrido);
  `Calendar.tsx` con entrada coherente (paneles fade+y + cascada de tarjetas,
  countdown y a11y intactos); **nuevo `components/ScrollProgress.tsx`** (barra
  2 px accent fija + marcador moto, `aria-hidden`, cero overflow horizontal,
  `scroll`/`resize` nativos con rAF, no se renderiza con reduced-motion) —
  **pendiente de montar en `App.tsx` por el Director**. Con reduced-motion: sin
  pin, todo visible/estático. `typecheck`+`build` **verdes** (build 916 ms;
  primer typecheck falló por errores TS ajenos, de `MagneticButton.tsx`; el
  reintento tras ~35 s ya salió verde).
- **[R1b · Director]** Revisión de código **H3.2 aprobada** (`Glow.tsx` sin
  dependencias nuevas, texturas con `dispose()`, `reduced` congelado) →
  **autorizado H3.3**. Integración R1b: `MagneticButton` y `ScrollProgress`
  importados y montados en `App.tsx` (`ScrollProgress` tras `<CustomCursor />`,
  nav con `MagneticButton strength 0.15-0.2`), CONTRACTS §5 con los tres
  componentes nuevos y §7 sin solicitudes abiertas.
- **[R2 · hero3d] H3.3 hecho: reactividad al scroll de la sección, parallax de
  puntero refinado, entrada ligada a `preloader:done` (+ timeout 5 s) y
  `MagneticButton` en el CTA; typecheck+build verdes. Hero 3D completo
  (H3.1-H3.3).**
  - `three/pointer.ts` pasa a ser el **estado compartido del hero**
    (`HeroState`: puntero + `scroll` + `entrance`/`entranceAt`) con helpers puros
    (`clamp`, `damp` independiente de fps, `entranceProgress` con ease-out que
    llega **exacto a 1**). Es un objeto mutable único: cero allocations por evento
    y por frame. (Se conserva el nombre del archivo por historia del proyecto.)
  - **Scroll→cámara** (`Rig`): `scroll`/`resize` **nativos** con rAF-throttle en
    `Hero3D` (CONTRACTS §4.2, sin depender de Lenis) escriben el progreso 0..1 de
    `#inicio` (`-rect.top / rect.height`); la cámara retrocede (z +1,45), sube
    (y +0,5), se desplaza de lado (−0,25) y baja un poco el punto de mira
    (−0,2). Todo amortiguado en el `useFrame` (salto de ancla 0→1 ⇒ paso máximo
    0,072/frame, sin overshoot) y reversible.
  - **Puntero**: parallax ya existente refinado — `clamp` en la entrada y en el
    offset de cámara (±0,6), amortiguación por `delta`, y se **suma** al offset de
    scroll en lugar de competir con él (mezcla estable); el giro por hover
    conserva su intensidad previa. Sin basura por frame.
  - **Entrada** (`three/Entrance.tsx`, nuevo): la moto sube desde el fondo
    (escala 0,9→1, y −0,22, z −0,95) y la cámara se asienta en paralelo; glow y
    trazas suben de intensidad (`entranceProgress`), y la moto además se desplaza/
    gira levemente con el scroll. Autorizada por `preloader:done`, por
    `dataset.preloader === 'done'` al montar o por **timeout de seguridad de 5 s**;
    listener retirado al desmontar. Con reduced motion: estado final sin animación.
  - **CTA**: `MagneticButton` (uidesign, sin ediciones) con `strength={0.25}`,
    mismo `onClick` (`scrollToSection('marcador')`) y misma a11y (`sr-only`), sin
    cambios de diseño.
  - Verificado además con Node (type stripping) sobre el módulo real: entrada
    monótona 0→1 exacta, `damp` idéntico a 15/30/60 fps, sin overshoot.
    `typecheck` + `build` **verdes** (835 ms; sigue el aviso de chunk `three`
    >900 kB, ajeno). En móvil se mantienen `detailed={!mobile}`, dpr ≤ 1,75 y
    `Environment` local. Sin dependencias nuevas ni solicitudes en §7.
