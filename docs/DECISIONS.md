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
