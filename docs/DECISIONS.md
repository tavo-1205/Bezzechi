# DECISIONS — rediseño "recorrido por el circuito"

Registro de decisiones del Director. Las reglas de colaboración están en
`docs/TEAM.md`; los contratos (tokens, eventos, interfaces) en `docs/CONTRACTS.md`.

## 2026-10-18 · PASO 0 (preparación)

- **`opencode.json` (nuevo, formato V2 verificado en la guía oficial)**: `$schema`
  `https://opencode.ai/config.json` + `permissions` globales `* → allow`, con
  `deny` a `rm -rf *`, `git push *` y `git reset --hard*`. Las reglas de los
  agentes personalizados se añaden DESPUÉS de las globales, así que `qa` sigue
  sin poder editar código (solo `docs/`) y a nadie le está permitido `npm run dev`.
  Verificado en sesión (denegación activa y comandos permitidos sin preguntar):
  **no hizo falta reiniciar OpenCode**.
- **Git**: no estaba instalado en el equipo → instalado **Git for Windows
  2.55.0.5 vía winget** (instalador oficial; no es una dependencia del proyecto).
  Cada invocación necesita ampliar el PATH de la sesión:
  `$env:PATH="C:\Program Files\Git\cmd;$env:PATH"`.
- **`.gitignore` creado** (no existía): evita versionar `node_modules/`, `dist/`,
  logs y `.env` en los commits de cada ronda.
- **Identidad git local genérica** (solo este repo): `gustavo <gustavo@localhost>`.
- **Commit inicial**: `7b75caf "antes del rediseño"` (48 archivos) → punto de
  restauración para los rolls-back del bucle de calidad.

## 2026-10-18 · Ronda 0 (documentación del rediseño)

- Concepto creativo "recorrido por el circuito", propiedad de archivos y estados
  en `TEAM.md`; tokens/tipografías/eventos/interfaces en `CONTRACTS.md`.
- Ajustes del usuario sobre el plan original (todos aplicados):
  1. `src/index.css` es del Director; `uidesign` solo añade clases nuevas en
     `src/styles/extras.css` (prefijo obligatorio `x-`), ya importado en index.css.
  2. `hero3d` trabaja por pasos H3.1 → H3.2 → H3.3 con `typecheck`+`build` y
     revisión del Director entre pasos.
  3. `nemotron` (visión) actúa como **revisor visual** con capturas
     (`browser.screenshot`) al final de cada ronda.
  4. `qa`: typecheck, build y Lighthouse; escribe solo en `docs/`; sin código ni `npm run dev`.
  5. Evento `preloader:done`: `scrollfx` no arranca Lenis y `hero3d` no inicia su
     entrada hasta recibirlo (CONTRACTS §4.1, con timeout de seguridad 4 s).
  6. Máximo 3 agentes en paralelo por ronda; orden: `hero3d` + `uidesign` +
     `livedata`, después `scrollfx`.
- **Sin dependencias nuevas** instaladas hasta la fecha (rediseño 100 % con
  three/R3F, GSAP y Tailwind ya presentes).

## Bucle de calidad (plan de entrega)

- Máximo **5 iteraciones** integrar → QA → corrección; **no se cierra con
  incidencias críticas ni altas**.
- `git add -A && git commit` antes y después de cada ronda (solo Director).
- Si un build se rompe y no se arregla en 2 intentos: `git checkout -- <archivos>`
  desde el último commit bueno y probar otro enfoque (prohibido `git reset --hard`
  y `git push` — además están denegados por `opencode.json`).
- Paquetes nuevos: registrar aquí antes de instalarlos. *Ninguno por ahora.*

## 2026-10-19 · Limitación del navegador integrado (verificación visual)

- El tab del navegador integrado está **oculto** (`document.visibilityState:
  "hidden"`, `hasFocus: false`): no hay rAF/render (el canvas del hero quedó en
  300×150 sin pintar) y `browser.screenshot` falla ("needs a visible tab").
- Consecuencia: la verificación de esta sesión se hace con DOM/geometría/estilos
  computados (`browser.evaluate`), consola (`browser.console`) y `typecheck`/`build`;
  la revisión **visual** final queda para el usuario (o se reintenta la captura si
  la ventana pasa a primer plano).
- `nemotron` pasa a revisar **código + snapshots de accesibilidad** en lugar de
  imágenes mientras no haya capturas.
- Estado observado en la primera carga: consola sin errores de la app (solo el
  aviso de la librería `motion` por reduced-motion activo en el tab de pruebas);
  `preloader:done` emitido y overlay retirado; 6 secciones en `main`;
  `overflowPx` = 120 en el documento con `body { overflow-x: hidden }` → posible
  incidencia media de desbordamiento para QA.

## 2026-10-19 · Ronda 4 (correcciones QA) y verificación runtime

- **El tab pasó a visible** durante la sesión (`visibilityState: "visible"`):
  `browser.screenshot` y `browser.lighthouse` ya funcionan. Las 7 capturas quedan
  en `%LOCALAPPDATA%\Temp\opencode\capturas\` (hero, marcador, trayectoria,
  estadisticas, calendario, galeria, fullpage).
- **Verificación runtime del Director** (vw = 800 px): 0 errores/rechazos JS al
  recorrer las 6 secciones; Lighthouse accesibilidad **1.00**, buenas prácticas
  **1.00**, SEO **1.00**, `failures: []` (la herramienta no da score de
  rendimiento); `scrollWidth - innerWidth = -15 px` (ancho del scrollbar) → 0
  desbordamiento; `grid-template-areas` del semáforo válido; **0** textos ≤ 12,5 px
  por debajo de 4,5:1; scroll restaurado en reposo; FCP 212 ms / DCL 172 ms.
- **QA-01 (chunk `three` 970 kB) → ACEPTADA y documentada**: es el chunk diferido
  del hero (`React.lazy`); three.js no se parte sin coste de mantenimiento y el
  aviso es solo un umbral. No se instala nada ni se sube el límite a ciegas.
- **QA-04 → CERRADA como no-incidencia**: el `h1` expone "MARCO BEZZECCHI" (CSS
  uppercase). Un `aria-label` en minúsculas violaría WCAG 2.5.3 (*label in name*)
  porque el texto visible es ese mismo. Sin cambios.
- **QA-07 → VERIFICADA sin incidencia** (0 textos por debajo de 4,5:1 en runtime).
- **QA-02/QA-03/QA-05/QA-09 → corregidas**: uidesign (semáforo rectangular,
  recorte del carrusel con `overflow-x-hidden`, transform del botón magnético solo
  desde el bucle) y hero3d (contenedor del "72" con `inset-0` + `overflow-hidden`).
  **QA-06/QA-08/QA-10 → verificadas/corregidas** por scrollfx.
- **Revisor visual**: subagente con modelo de visión
  `opencode/nemotron-3.5-super-vl-free` sobre las capturas (petición explícita del
  usuario de un revisor visual con capturas; el Director no puede leer imágenes).
- **Limitación que se mantiene**: no existe herramienta de emulación de
  dispositivo/ancho en este entorno → el responsive móvil se verifica por CSS
  (breakpoints `sm/md/lg/xl` + `clamp`), no por captura.

## 2026-10-19 · Override de movimiento `?motion=full` (solicitud de verificación visual)

- **Causa raíz de «no se ven las animaciones»**: el equipo tiene los efectos de
  animación de Windows **desactivados** —medido: `SPI_GETCLIENTAREAANIMATION = false`
  y `MinAnimate = 0`—, así que **todos** los navegadores del equipo reportan
  `prefers-reduced-motion: reduce` y la web apagaba todo el movimiento a propósito
  (criterio 8). El código era correcto; lo que fallaba era el contexto.
- **Solución** (sin tocar ningún componente): `src/lib/motion.ts` parchea
  `window.matchMedia` cuando la URL lleva `?motion=full` (persistido en
  `localStorage['bz72:motion']`), marcando `html[data-motion="full"]`. Los 5 bloques
  CSS `@media (prefers-reduced-motion: reduce)` quedan limitados a
  `html:not([data-motion='full'])`. `?motion=system` lo desactiva y vuelve al
  comportamiento del sistema.
- **Accesibilidad intacta**: por defecto (sin parámetro) todo sigue respetando
  `prefers-reduced-motion`; el override es explícito, documentado y reversible.
- Riesgo aceptado y decidido por el Director: revisión inmediata de typecheck/build y
  de los estados con y sin override.
