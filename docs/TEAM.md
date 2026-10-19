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
| `components/Hero3D.tsx`, `components/three/**` | hero3d | hecho | H3.1-H3.3 completos: moto, trazas+glow, reactividad (scroll/puntero/entrada con `preloader:done`) y `MagneticButton` en el CTA (§9 R2). R4b: tramo intermedio 768-1100 px (`HeroTier` + `HERO_POSES`) → titular y moto separados (§9 R4b) |
| `components/Preloader.tsx` (nuevo) | uidesign | hecho | emisor `preloader:done` |
| `components/TiltCard.tsx`, `SectionHeading.tsx` | uidesign | hecho | primitivas de UI |
| `components/Gallery.tsx`, `Footer.tsx` | uidesign | hecho | conservar a11y del lightbox |
| `components/MagneticButton.tsx` (nuevo) | uidesign | hecho | atracción al puntero (lerp + `translate3d`) |
| `lib/scroll.ts`, `components/Timeline.tsx`, `Calendar.tsx`, `components/ScrollProgress.tsx` (nuevo, sin montar) | scrollfx | en curso | R1b: Lenis detenido hasta `preloader:done` · pin/scrub + moto · `ScrollProgress` pendiente de montar por el Director |
| `components/LiveScoreboard.tsx`, `StatsCharts.tsx`, `CareerStats.tsx` | livedata | en curso | estilo cabina; R4b: el pill "Última" nombra la última carrera disputada (fallback genérico) |
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

> Auditoría Ronda 3 (agente `qa`). Verificaciones ejecutadas: `npm run typecheck` y
> `npm run build` en verde. El **navegador integrado no está conectado a esta
> sesión** (`browser.disconnected`), por lo que la verificación runtime (consola,
> Lighthouse, geometría/overflow por elemento, DOM nodes, canvas, contrastes) **no
> se pudo ejecutar**; se solicita al Director al final de esta sección. El resto
> se audita por lectura de código + build. `src/data/api.ts` confirmado sin
> cambios frente a `7b75caf` (`git diff` vacío).

### Incidencias

| ID | Severidad | Criterio | Archivo(s) | Descripción con evidencia | Acción sugerida | Agente propuesto |
|---|---|---|---|---|---|---|
| QA-01 | media | 1, 3 | `npm run build` (salida) | `typecheck` y `build` verdes. Aviso preexistente: chunk `three` = 970.28 kB (gzip 262.04) > 900 kB. Total dist 1.98 MB (≈581 kB gzip). | Documentar; valorar code-split del chunk `three` o subir límite. | Director |
| QA-02 | alta | 4 | `src/styles/extras.css:39-81` | `grid-template-areas` del semáforo no es rectangular: fila 1 `"red"` (1 col), fila 2 `"amberL amberR"` (2 cols), fila 3 `"green"` (1 col). Declaración inválida → se ignora y las luces caen en auto-placement (semáforo visual roto / ámbar no pareado). | Hacerla rectangular: `"red red"` / `"amberL amberR"` / `"green green"`. → CORREGIDA (R4) | uidesign |
| QA-03 · **CORREGIDA (R4)** | media | 8, 10 | `src/components/Hero3D.tsx:145-157` | Desbordamiento horizontal en carga inicial: el contenedor del "72" gigante era `absolute right-0 translate-x-[8%]` con `font-size: clamp(16rem, 40vw, 42rem)`, excedía el viewport (medido a vw 800 px: `right = 823 px`); `body { overflow-x: hidden }` lo ocultaba pero aportaba al `scrollWidth` del documento. Elemento decorativo (`aria-hidden`). | **Aplicado en R4 (hero3d):** contenedor `absolute inset-0 overflow-hidden` + `justify-end` y el `translate-x-[8%]` movido al `span`. La caja del contenedor es ahora exactamente la de la sección (sin transform ni offset negativo) y el recorte del "72" ocurre **dentro** de su propio `overflow: hidden`, así que ningún descendiente puede propagar ancho. Efecto visual idéntico (mismo recorte por el borde derecho). **Pendiente:** confirmar en runtime `document.documentElement.scrollWidth === window.innerWidth` (y que el resto del overflow sea de QA-09). | hero3d |
| QA-04 · **CERRADA: no-incidencia (WCAG 2.5.3)** | baja | 4 | `src/components/Hero3D.tsx:171-187` | El `h1` anuncia "MARCO BEZZECCHI" (uppercase por CSS) y no "Marco Bezzecchi" en mixed-case como asumía la bitácora. El nombre accesible es correcto y contiene el texto visible. | **Decisión R4: NO añadir `aria-label`** — sería un anti-patrón de *label-in-name* (el texto visible es el mismo, solo cambia el caso por CSS). Sin cambios de código. Referencia de mixed-case corregida en §9. | — |
| QA-05 | media | 7 | `src/components/MagneticButton.tsx:143-167` | El `transform` se deriva de `position.current` (ref) en cada render y se sobrescribe imperativamente en `step()`; un re-render del padre a mitad de la animación puede reescribir el transform y provocar saltos. | Verificar en navegador; si se reproduce, usar motion value o evitar re-render durante la animación. → CORREGIDA (R4) | uidesign |
| QA-06 | baja | 9 | `src/components/Gallery.tsx:83-92` | Lightbox bloquea scroll con `body.style.overflow = 'hidden'` (temporal) y restaura `previousOverflow`; `stopScroll()`/`startScroll()` respetan `locked`. Lógica correcta por código, pero la restauración de `html` con clase `lenis-stopped` no se verifica aquí. | Verificar en navegador (abrir/cerrar lightbox y comprobar `overflow` de `html`/`body` en reposo). | scrollfx · **VERIFICADA (R4)** sin cambios: revisados los 4 caminos en `lib/scroll.ts` + `Gallery.tsx` — (1) cierre normal: `startScroll()` → `lenis.start()` retira `lenis-stopped` (Lenis 1.x gestiona esa clase en su propio start/stop, pareja 1:1 garantizada) y Gallery restaura `body.overflow`; (2) Esc DURANTE el preloader (locked): `startScroll()` sale pronto sin arrancar, `externallyStopped` queda `false` y el desbloqueo lo hace `finished()` (por evento o safety 4,5 s, que SIEMPRE corre) — el intervalo stoppéd coincide con el contrato §4.1, no es fuga; (3) desmontaje con lightbox abierto: el cleanup del efecto de Gallery corre en unmount (React 19) restaurando `body.overflow` + `startScroll()`; (4) reduced-motion: no hay Lenis ni clase, y el bloqueo lo cubre íntegramente `body.overflow='hidden'` (propagación de overflow a la viewport: corta también teclado/barras). `html.overflow` no lo toca NADIE en la app (lenis no lo modifica), así que no hay nada que restaurar. Sin puerta donde el scroll pueda quedar bloqueado. |
| QA-07 | baja | 2, 6 | `src/components/LiveScoreboard.tsx:204-225`, `StandingsPanel` | Textos pequeños (`text-[10px]`/`[11px]`) en `text-ash` sobre `carbon`/`carbon-2` en KPIs y Top 5; contraste AA no medible sin Lighthouse/runtime. | Medir contraste en navegador (Lighthouse/axe). | livedata |
| QA-08 | baja | 5 | `src/components/Timeline.tsx:105` | `document.querySelector('[data-tl-head]')` es global en lugar de acotado a `rootRef`; funciona pero es frágil si hubiera varios. | Acotar a `rootRef.current?.querySelector('[data-tl-head]')`. | scrollfx · **CORREGIDA (R4)**: query ahora por ref `<section ref={sectionRef}>` (`section?.querySelector('[data-tl-head]')`). Nota técnica: el `head` está DENTRO de la sección pero FUERA del pin viewport (`rootRef`), así que `rootRef.querySelector` lo habría devuelto `null` y habría retirado el reveal; el scope correcto e inmenso en intención (no usar `document.`) es el ref de la sección, que cubre el árbol completo del tramo con guarda de null (`section?.`). |
| QA-09 | media | 10 | `src/components/Gallery.tsx:205-227` | Los slides del carrusel usan `x: ±36% * abs` (hasta ±108% del ancho del slide) sin `overflow-hidden` en el contenedor del carrusel → posible desbordamiento horizontal en móvil/tablet tras la carga diferida. No verificado (lazy, no cargado en auditoría estática). | Añadir `overflow-hidden` al contenedor del carrusel o recortar transforms. → CORREGIDA (R4) | uidesign |
| QA-10 | baja | 5 | `src/components/Calendar.tsx:369-407` | El efecto de entrada GSAP depende de `revealKey` (`status:rounds`) y se re-ejecuta al cargar datos; recrea ScrollTriggers. Hay `ctx.revert()` en cleanup, pero no se verifica acumulación en runtime. | Verificar en consola que no haya warnings de ScrollTrigger duplicado. | scrollfx · **VERIFICADA (R4)** sin cambios — el patrón ya es a prueba de balas: (1) cada run del efecto crea UN SOLO `gsap.context`; (2) el cleanup `return () => ctx.revert()` es incondicional en el único camino que crea triggers (el early-return de reduced-motion no crea nada, así que ahí no hay fuga posible); (3) React ejecuta SIEMPRE el cleanup del run anterior antes del siguiente run y en el unmount — con el StrictMode de `main.tsx` incluido (mount→revert→mount), por lo que en cada instante hay a lo sumo UN contexto activo y cero triggers duplicados; (4) `ctx.revert()` mata los ScrollTriggers Y restaura los estilos inline de los tweens `from()`, así que los re-runs no acumulan transformaciones; (5) `revealKey` (`status:rounds.length`) cubre exactamente las mutaciones que cambian los paneles (skeleton→cargado, aparición de grupos) y los cambios de datos que NO cambian la clave reutilizan los mismos nodos (keys estables de React en los `li`), por lo que los triggers siguen atados a nodos vivos sin recrearse. |

### Resumen por criterio (1-10)

| Criterio | Estado | Nota |
|---|---|---|
| 1 · `typecheck` + `build` | ✓ | Verdes. Warning preexistente chunk `three` >900 kB. |
| 2 · Cero errores de consola (desk/móvil) | no verificable | Navegador desconectado. DECISIONS registra solo aviso de librería `motion` por reduced-motion activo en el tab de pruebas. |
| 3 · Lighthouse a11y >90 / perf >80 | no verificable | Navegador desconectado y Lighthouse exige tab visible. Medido por build: chunks (three 970 kB, charts 368 kB, motion 259 kB, react 210 kB) y total 1.98 MB. DOM/canvas/listeners/contrastes no medibles. |
| 4 · Hero (preloader + moto 3D + tipografía) | ✓ (código) | `preloader:done` se emite 1 vez; overlay se retira; CTA es `MagneticButton` (`<button>` real); `h1` accesible "MARCO BEZZECCHI". Canvas no verificable (tab oculto → 300×150 sin pintar, limitación, no fallo). QA-02/QA-04 abiertas. |
| 5 · Scroll pin/scrub/progreso circuito | ✓ (código) | `ScrollTrigger` presente, `ScrollProgress` montado (`aria-hidden`), `invalidateOnRefresh` en Timeline. Fugas de listeners no detectadas por lectura. QA-08/QA-10 abiertas. |
| 6 · Marcador cabina (estados) | ✓ (código) | Carga/error/caché, `aria-live`, `role`. `src/data/api.ts` sin cambios (git diff vacío). QA-07 abierta (contraste). |
| 7 · Timeline + galería + lightbox + cursor + magnéticos + countdown | ✓ (código) | Lightbox: trampa de foco, `Esc`, bloqueo temporal de scroll. Cursor y magnéticos se desactivan con reduced-motion. QA-05/QA-09 abiertas. |
| 8 · `prefers-reduced-motion` + responsive | ✓ (código) reduced / responsive no verificable | Reduced respetado en Lenis, GSAP, pin, partículas, magnéticos, cursor, TiltCard, StatsCharts, CareerStats. Responsive por lectura de CSS (md/lg/xl/sm, clamp). Overflow 120 px (QA-03). |
| 9 · Scroll nunca bloqueado | ✓ (código) | Bloqueo temporal en lightbox con restauración; verificar runtime (QA-06). |
| 10 · Ninguna sección vacía/rota/solapada | ✗ (parcial) | Overflow 120 px (QA-03), grid del semáforo inválido (QA-02), posible overflow del carrusel (QA-09). Resto OK por código. |

### Verificación runtime del Director (R4 — tab ya visible)

Medido por el Director en `http://localhost:5173/` (Vite dev) con `vw = 800 px`:

| Comprobación | Resultado |
|---|---|
| Consola tras recorrer las 6 secciones (`onerror`+`unhandledrejection` instrumentados) | **0 errores / 0 rechazos**. Único mensaje: aviso de la librería `motion` por reduced-motion activo en el tab de pruebas |
| Lighthouse (`browser.lighthouse`, tab actual) | accesibilidad **1.00**, buenas prácticas **1.00**, SEO **1.00**, `failures: []`. **No** da score de rendimiento (no emula dispositivo ni ejecuta perfil de perf) |
| Rendimiento (proxy dev, reduced-motion) | FCP 212 ms, DCL 172 ms, 75 recursos / 121 kB, 1 263 nodos DOM, ~145 fps de `rAF` (pantalla de alta frecuencia y animaciones 3D apagadas → no representativo de la carga con movimiento) |
| Desbordamiento horizontal | `scrollWidth - innerWidth = -15 px` (ancho del scrollbar) → 0 → **QA-03 y QA-09 confirmadas corregidas** |
| Semáforo | `getComputedStyle(.x-traffic-light).gridTemplateAreas` = `"red red" "amberL amberR" "green green"` → declaración válida → **QA-02 confirmada corregida** |
| Contraste | **0** textos ≤ 12,5 px por debajo de 4,5:1 → QA-07 verificada sin incidencia |
| Scroll en reposo | `html { overflow-y: visible }`, `body { overflow-y: auto }`, `scrollY` restaurado a 0 → QA-06 verificada |
| Canvas del hero | 785×656 CSS / 980×820 de buffer, renderizando |

Limitaciones registradas: no hay herramienta de emulación de dispositivo/ancho en este entorno (responsive móvil solo verificable por CSS); Lighthouse no ofrece score de rendimiento.

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
- **[R4 · uidesign]** QA-02 (alta): `grid-template-areas` del semáforo hecho rectangular
  (`"red red"` / `"amberL amberR"` / `"green green"`) en `src/styles/extras.css`; rojo arriba y
  verde abajo centrados, doble ámbar pareado, sin tocar `.x-light--on` ni colores. QA-09 (media):
  `overflow-x-hidden` en el contenedor del carrusel de `src/components/Gallery.tsx` (205-227) para que
  los translates de ±108% no agranden `document.documentElement.scrollWidth`; coverflow y asomado de
  slides laterales preservados. QA-05 (media): `src/components/MagneticButton.tsx` — el `transform`
  se escribe solo desde el bucle `step()` (nunca del render), snap exacto al destino al terminar y
  handlers de puntero/foco no se enlazan con `prefers-reduced-motion`/`(pointer: coarse)`; typecheck +
  build verdes.
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
- **[R3 � qa]** Auditor�a est�tica + `typecheck`/`build` verdes. Navegador integrado desconectado (sin consola/Lighthouse/overflow runtime). 10 incidencias abiertas: 1 alta (QA-02 grid del sem�foro inv�lido en extras.css), 4 media (QA-01 chunk three, QA-03 overflow 120 px del "72" en Hero3D, QA-05 saltos en MagneticButton, QA-09 overflow del carrusel de Gallery) y 5 bajas. Criterios 2 y 3 no verificables por tab oculto; solicitada verificaci�n runtime al Director en �8. `api.ts` confirmado sin cambios.
- **[R4 · hero3d] QA-03 corregida (overflow del "72"): contenedor del número con
  `inset-0` + `overflow-hidden` y el `translate-x-[8%]` movido al `span` (recorte
  dentro de su propia caja, caja del contenedor = caja de la sección → no puede
  aportar ancho al documento, mismo efecto visual); QA-04 cerrada como
  no-incidencia (WCAG 2.5.3); typecheck+build verdes.**
  - `src/components/Hero3D.tsx:145-157`: antes el wrapper era
    `absolute inset-y-0 right-0 translate-x-[8%]` (el transform sacaba su caja
    823 px a vw 800). Ahora el wrapper es `absolute inset-0 overflow-hidden
    ... justify-end` (sin transform propio, sin `right`/width fuera) y el
    `translate-x-[8%]` vive en el `span`, recortado por el `overflow: hidden` del
    wrapper: el "72" sigue asomando cortado por el borde derecho con los mismos
    píxeles, pero nada de lo que pinta queda fuera de la caja del contenedor.
  - QA-04: decisión del Director aplicada **sin cambios de código** (no se añade
    `aria-label` al `h1`; el texto visible y el nombre accesible siguen alineados).
  - `typecheck` y `build` **verdes** (827 ms; se mantiene el aviso de chunk
    `three` >900 kB, ajeno). Sin dependencias nuevas. Nota: el navegador integrado
    no está conectado a la sesión de `hero3d`, así que la medición runtime
    (`scrollWidth === innerWidth`) queda para el Director/QA.
- **[R4 · scrollfx] QA-06/08/10 cerradas: QA-08 CORREGIDA, QA-06 y QA-10
  VERIFICADAS sin cambios; typecheck+build verdes.**
  - **QA-08 (Timeline.tsx, la única de código)**: eliminada la query global
    `document.querySelector('[data-tl-head]')` — ahora con `sectionRef` en el
    `<section id="trayectoria">` y query acotada `section?.querySelector(...)`
    con guarda de null (Timeline.tsx:31-41, 49-53, 113-114, 158-164). No se usó
    `rootRef` porque el head vive FUERA del pin viewport por diseño; ref de
    sección cubre el árbol completo con la guarda ya pedida. El resto de
    queries del efecto ya estaban acotadas a `rootRef`/items.
  - **QA-06 (scroll.ts + Gallery, VERIFICADA)**: caminos revisados — cierre
    normal (`lenis.start()` retiría `lenis-stopped` gestionada por el propio
    Lenis), Esc durante el preloader (`startScroll()` respeta `locked`; el
    desbloqueo lo hace `finished()` que SIEMPRE corre por evento o safety de
    4,5 s), desmontaje con lightbox abierto (cleanup de React restaura
    body/scroll) y reduced-motion (sin Lenis; `body.overflow='hidden'` cubre
    el bloqueo por propagación de overflow a la viewport). `html.overflow` no
    se toca nunca en la app: nada que restaurar. Sin fuga posible.
  - **QA-10 (Calendar.tsx, VERIFICADA)**: patrón `gsap.context` con cleanup
    `return () => ctx.revert()` incondicional en el único camino que crea
    triggers; React garantiza cleanup del run anterior antes del siguiente
    (StrictMode de `main.tsx` incluido) → como máximo un contexto activo y
    cero triggers duplicados; `ctx.revert()` además mata ScrollTriggers y
    restaura estilos inline de los `from()`; `revealKey` cubre justo las
    mutaciones que cambian paneles y los cambios menores reutilizan nodos
    (keys estables), con triggers atados a nodos vivos.
  - `typecheck` + `build` **verdes** (864 ms; aviso de chunk `three` >900 kB
    preexistente y ajeno). Sin dependencias nuevas ni ediciones ajenas.
- **[R4b · hero3d] Tramo intermedio del hero (768–1100 px): composición propia
  "titular + moto" sin solape; tipo intermedio/Desliza alineado; typecheck+build
  verdes.**
  - `three/useBreakpoint.ts` reescrito: `HeroTier`
    (`phone` | `compact` | `compact-portrait` | `wide`) con **4 media queries
    reales mutuamente excluyentes** (`(min-width:768px) and (max-width:1100px)`
    × `orientation`; `wide` = `(min-width:1101px)`). Un `MediaQueryList` por
    tramo con `change`, más `resize` como red de seguridad, ambos rAF-throttled
    y liberados en el cleanup; `commit` **solo** llama a `setState` si el tramo
    cambia (un `resize` que no cruza ningún límite no re-renderiza el hero ni la
    escena 3D). Se elimina el viejo `useBreakpoint` (su único consumidor era
    `HeroScene`).
  - `three/heroLayout.ts` (nuevo): tabla `HERO_POSES` con cámara + sitio de la
    moto + plano de niebla por tramo. `phone` y `wide` repiten **exactamente**
    los valores anteriores (`[0,1.6,8.5]` / moto `0,−0,15` / niebla 8-15 y
    `[0,1.05,5.6]` / moto `1,15,0` / niebla 8-15) → **móvil y escritorio ancho
    intactos**. `compact` (apaisado): cámara `[0,1.3,8.4]`, moto `[1.55,−0.12]`,
    niebla 13-22; `compact-portrait`: cámara `[0,1.45,14]`, moto `[1.9,−0.1]`,
    niebla 16-25 (lienzo estrecho → más distancia y más desplazamiento). La
    niebla acompaña a la cámara para que la moto no se apague al fondo.
  - `Hero3D.tsx` pasa a ser el **único dueño del tramo** y lo comparte con
    `HeroScene`/`Rig` (antes cada uno resolvía su `matchMedia` por su cuenta):
    titular `clamp(2.6rem,7vw,6.5rem)` y subtítulo `max-w-sm` en compact
    (`9vw/7.5rem` y `max-w-xl` fuera de él). `Rig` recibe la pose en lugar de
    tener su propia cámara base (misma reactividad, sin allocations por frame).
  - **Medición del encuadre** (proyección real de la cámara, fov 35, y anchos
    reales de Orbitron 900 leídos del WOFF de Google Fonts: "BEZZECCHI" =
    6,490 em con `tracking-tight`): a **800×656** (evidencia del Director) el
    titular acaba en **403 px** y la caja de la moto empieza en **444 px** →
    **40 px de aire**, moto entera dentro del lienzo y **0 solape** con
    subtítulo y CTA; 42-58 px de aire en todo el rango apaisado (769→1100 px) y
    76-115 px en vertical (768→1024 px). Para comparar: en el tramo ancho la
    caja de la moto arranca *antes* del final del titular (composición que el
    Director da por buena), así que la medida es conservadora.
  - "Desliza": el indicador ya vivía dentro de `container-x` (mismo eje de
    40 px que el titular), así que **no he reproducido el `left = 0`** medido
    (probablemente se midió otro nodo del hero). Aun así queda blindado: wrapper
    `motion.div` → `w-fit` y botón `flex` (antes `inline-flex w-fit`), de modo
    que la caja del indicador arranca **por construcción** en el borde de
    contenido de `container-x`. Se agradece re-medir `#inicio button` frente al
    `h1` en runtime.
  - Sin dependencias nuevas; partículas, glow, materiales y reactividad **sin
    tocar**. `typecheck` + `build` en **verde** (801 ms; se mantiene el aviso de
    chunk `three` >900 kB, QA-01, ajeno).
- **[R4b · livedata]** Riel del marcador: cuando NO hay fin de semana activo
  (`raceWeekend.active === false`), el pill ya no dice solo "Última carrera
  disputada" (sonaba a estado vacío) sino que **nombra la última carrera
  disputada**: `pickLastRace()` en `src/components/LiveScoreboard.tsx` elige de
  `season.rounds` la ronda más reciente con `status === 'finished'` o `raceDate`
  ya pasada (desempate por nº de ronda; nombre = `round.name` colapsando
  espacios con `round.country` de apoyo). Visible: `Última · PERTAMINA GRAND
  PRIX OF INDONESIA` —misma nomenclatura que el pill EN VIVO, que ya usa el
  nombre patrocinado del servidor (`raceWeekend.name`)—; el «·» va
  `aria-hidden` y se expone un `sr-only` legible ("Última carrera disputada:
  <GP> (ronda N)."). Sin datos utilizables → **fallback** al texto genérico
  anterior (el pill nunca queda vacío; el caso en vivo con `.live-dot` intacto).
  Sin cambios de clases/colores → contraste AA del pill intacto (ash sobre
  carbon-2 ≈ 6,6:1; medición runtime R4: 0 textos < 4,5:1). Verificado con Node
  sobre el snapshot real: elige R17 Indonesia (coherente con el R17/22 del
  riel), sin ninguna disputada → null → fallback. `api.ts` congelado e intacto,
  sin dependencias nuevas; typecheck+build **verdes** (el primer typecheck chocó
  con una edición en paralelo de hero3d en `three/HeroScene.tsx`, ajena; verde
  al reintentar según la regla 2. Se mantiene el aviso preexistente de chunk
  `three` >900 kB, QA-01 aceptada).
