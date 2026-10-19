# CONTRACTS — rediseño "Recorrido por el circuito"

> Única fuente de verdad sobre tokens, clases, interfaces y eventos.
> Los contratos los define el **Director**; cambiar un contrato exige solicitud en
> `docs/TEAM.md` → "Solicitudes al Director". Los demás solo LEEN este archivo.
> Última actualización: **Ronda 0**.

## 1 · Tokens — `src/index.css` (DUEÑO: Director; nadie más lo edita)

### 1.1 Color (`@theme`, uso directo en Tailwind)
| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#08080a` | fondo base |
| `--color-carbon` | `#0e0e12` | superficie 1 |
| `--color-carbon-2` | `#15151a` | superficie 2 |
| `--color-accent` | `#ff4d00` | acento Aprilia (activo, hover) |
| `--color-accent-600` | `#dc3c00` | acento oscuro (presión, borde) |
| `--color-accent-300` | `#ff8a3d` | acento claro (brillos, gradiente) |
| `--color-mist` | `#f6f6f8` | texto principal |
| `--color-ash` | `#9a9aa4` | texto secundario |
| `--color-line` | `#26262e` | bordes/líneas |
| `--color-signal-red` | `#ff3b21` | luz roja del semáforo (aprobado R1a) |
| `--color-signal-amber` | `#ffb02e` | luz ámbar del semáforo (aprobado R1a) |
| `--color-signal-green` | `#2ee06a` | luz verde del semáforo (aprobado R1a) |

Uso Tailwind: `bg-ink`, `bg-carbon-2`, `text-mist`, `text-ash`, `text-accent`,
`border-line`, `bg-accent/10`, `from-ink via-ink/70`… **No crear colores nuevos
sin aprobarlo en CONTRACTS.** Los tres `signal-*` son exclusivos del semáforo
(Preloader) y su adopción en `extras.css` la hace `uidesign`.

### 1.2 Tipografía
- `--font-display` → **Orbitron** (`.font-display`): títulos, cifras grandes.
- `--font-cond` → **Barlow Condensed** (`.font-cond`): eyebrows, labels HUD.
- `--font-sans` → **Inter**: cuerpo.
- `.num` → cifras tabulares (obligatorio en odómetros, contadores, marcas de tiempo).

### 1.3 Layout
- `--nav-h: 4.5rem` (altura del nav).
- `.container-x` → contenedor con márgenes; `.section` → bloque de sección
  (`position: relative`, padding; las secciones usan `className="section scroll-mt-24"`).

## 2 · Clases base existentes (`index.css` — solo el Director las cambia)
`container-x`, `section`, `glass`, `glow-border`, `eyebrow`, `num`, `text-outline`,
`accent-gradient`, `grid-bg`, `skeleton`, `live-dot`, `cursor-ring`, `cursor-dot`,
`no-scrollbar` + media-query global `prefers-reduced-motion` (no eliminar).

## 3 · Extensiones — `src/styles/extras.css` (DUEÑO: uidesign)
- **Único CSS que un especialista puede crear/editar.** Ya está importado en
  `index.css` por el Director (tras `@import "tailwindcss"`).
- Toda clase nueva lleva prefijo **`x-`** (p. ej. `.x-spotlight`, `.x-preloader`).
- No tocar tokens ni clases base. Preferir `@layer components { … }` salvo que la
  clase deba ganar a utilities de Tailwind.
- Cualquier animación nueva se anula en `@media (prefers-reduced-motion: reduce)`.

## 4 · Eventos

### 4.1 `preloader:done` (CustomEvent en `window`) — OBLIGATORIO
- **Emisor:** `Preloader` (uidesign, `src/components/Preloader.tsx`).
- **Secuencia:** montaje → semáforo (rojo → doble ámbar → verde, ≈2,2 s) →
  1) `document.documentElement.dataset.preloader = 'done'`
  2) `window.dispatchEvent(new CustomEvent('preloader:done'))`
  3) overlay sale con fade.
- **`prefers-reduced-motion`:** sin secuencia → atributo + evento en el primer render.
- **Garantías:** se dispara exactamente 1 vez y siempre; **timeout de seguridad a
  los 4 s** (la página nunca queda bloqueada aunque algo falle).
- **Consumidores:**
  - **scrollfx:** `initSmoothScroll()` arranca con Lenis **detenido**; al recibir
    `preloader:done` (o si `dataset.preloader === 'done'` al montar) → `lenis.start()`.
    `scrollToSection()` no hace scroll hasta entonces.
  - **hero3d:** no inicia su animación de entrada (reveal del título, arranque de
    partículas) hasta `preloader:done`. Estado inicial oculto SOLO si no hay
    reduced-motion (evitar FOUC inverso).
- Patrón de escucha:
  ```ts
  const onReady = () => { /* … */ };
  if (document.documentElement.dataset.preloader === 'done') onReady();
  else window.addEventListener('preloader:done', onReady, { once: true });
  ```

### 4.2 API de scroll — `src/lib/scroll.ts` (DUEÑO: scrollfx)
Firmas estables (consumidores: `App.tsx`, `Gallery.tsx`; cambiarlas = solicitud):
`initSmoothScroll()`, `scrollToSection(id)`, `stopScroll()`, `startScroll()`.
Reactividad de scroll para 3D/UI: usar **eventos nativos** `scroll` + `pointermove`
con rAF-throttle (Lenis actualiza `window.scrollY` nativo).

## 5 · Interfaces compartidas
- **Datos (FROZEN `src/data/api.ts`):** no se lee aquí, es inmutable. Exports usados:
  `useLiveData()` (hook único con polling 60 s/15 s), `getBezzecchi(standings)`,
  `formatLastUpdate(ts)`, tipos `StandingsData` y `SeasonData`.
- **`TiltCard`** (DUEÑO: uidesign): props `{ label?: string; className?: string;
  intensity?: number; children: ReactNode }`. Consumidor: `CareerStats` (livedata).
  Cambio de props → solicitud.
- **`StatsCharts`** (DUEÑO: livedata): props `{ evolution: Point[];
  bezzecchiName?: string; leaderName?: string; compact?: boolean }`
  (`compact` opcional y retrocompatible: oculta el riel de lectura y reduce
  altura — aprobado por el Director en R1a).
- **`SectionHeading`** (DUEÑO: uidesign): `{ eyebrow; title; subtitle?; align? }`;
  **`Reveal`**: `{ className?; children }` wrapper de entrada.
- **Nuevos componentes registrados (R1b):**
  - **`MagneticButton`** (DUEÑO: uidesign, `export default` + `forwardRef`):
    `{ children; className?; strength?: number /* 0-1, def. 0.35 */; onClick?;
    onFocus?; onPointerMove?; onPointerLeave? } & ButtonHTMLAttributes<HTMLButtonElement>`.
    Atracción desactivada con `prefers-reduced-motion` y `(pointer: coarse)`.
    Consumidores: `Footer`, `Gallery` y el nav de `App.tsx` (Director).
  - **`ScrollProgress`** (DUEÑO: scrollfx, `export default`, sin props): barra de
    progreso tipo circuito, decorativa (`aria-hidden`); devuelve `null` con
    reduced-motion. Montada en `App.tsx` (Director).
  - **`Preloader`** (DUEÑO: uidesign, `export default`, sin props): emisor de
    `preloader:done` (§4.1). Montado en `App.tsx` (Director).
  - **`HeroGlow` / `SpeedParticles`** (DUEÑO: hero3d): internos de `three/**`.

## 6 · Reglas duras
1. Un solo dueño por archivo (tabla de `TEAM.md`); cambios ajenos → solicitud.
2. Contenido visible en **español**; HTML semántico, `alt`, foco visible, AA.
3. 60 fps objetivo; `prefers-reduced-motion` respetado en CSS, JS y 3D.
4. Nadie termina tarea sin `npm run typecheck` **y** `npm run build` en verde
   (si el build choca con otro agente compilando, reintentar una vez).
5. `npm run dev` solo lo ejecuta el Director (permiso denegado para agentes).
