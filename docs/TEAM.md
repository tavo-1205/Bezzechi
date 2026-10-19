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
| `src/styles/extras.css` | uidesign | pendiente | clases con prefijo `x-` |
| `App.tsx`, `main.tsx`, `index.html` | Director | pendiente | único integrador |
| `components/Hero3D.tsx`, `components/three/**` | hero3d | pendiente | pasos §6 |
| `components/Preloader.tsx` (nuevo) | uidesign | pendiente | emisor `preloader:done` |
| `components/TiltCard.tsx`, `SectionHeading.tsx` | uidesign | pendiente | primitivas de UI |
| `components/Gallery.tsx`, `Footer.tsx` | uidesign | pendiente | conservar a11y del lightbox |
| `lib/scroll.ts`, `components/Timeline.tsx`, `Calendar.tsx` | scrollfx | pendiente | espera `preloader:done` |
| `components/LiveScoreboard.tsx`, `StatsCharts.tsx`, `CareerStats.tsx` | livedata | pendiente | estilo cabina |
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

_(vacío)_

## 8 · Incidencias QA

_(vacío — formato: prioridad crítica|alta|media · archivo:línea · problema)_

## 9 · Bitácora

- **[R0 · Director]** TEAM.md + CONTRACTS.md creados; `extras.css` importado en
  `index.css`; agentes actualizados (pasos 3D, preloader:done, extras.css, QA).
- **[PASO 0 · Director]** `opencode.json` (permisos V2) y `.gitignore` creados;
  git instalado + repo inicializado; commit `7b75caf "antes del rediseño"`.
