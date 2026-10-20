# MARCO BEZZECCHI #72 — Landing oficial de fans (MotoGP 2026)

Landing *one-page* premium dedicada a **Marco Bezzecchi** (Aprilia Racing, #72), con
**marcador de puntos del Mundial MotoGP 2026 en tiempo real**, escena 3D, trayectoria
completa (Moto3 → Moto2 → MotoGP), estadísticas, calendario con cuenta atrás y galería
con fotografías libres.

> ⚠️ Sitio de fans **no oficial**. Sin relación con MotoGP™, Dorna Sports, Aprilia
> Racing ni con el piloto.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript (modo estricto) |
| Estilos | Tailwind CSS 4 (`@theme`, tokens de marca en `src/index.css`) |
| 3D | Three.js + `@react-three/fiber` + `@react-three/drei` (moto procedural, sin GLB) |
| Animación | GSAP + ScrollTrigger, Framer Motion |
| Scroll | Lenis (integrado con el ticker de GSAP) |
| Gráficas | Recharts |
| Datos | Proxy Node (Express en producción / middleware Vite en dev) → API pública de MotoGP |

## Requisitos

- **Node.js ≥ 20** (probado con Node 24) y npm.
- Conexión a internet solo la primera vez (`npm install`) y para los datos en vivo.

## Arranque

```bash
npm install        # 1 · dependencias
npm run dev        # 2 · arranca Vite + API en http://localhost:5173
```

`npm run dev` levanta **un solo proceso**: el plugin `motogp-live-api` de
`vite.config.ts` monta el proxy `/api` como middleware, así que **no hay CORS** y no
hace falta arrancar un servidor aparte.

```bash
npm run dev        # desarrollo (Vite + proxy /api)
npm run build      # typecheck + build de producción en dist/
npm start          # producción: Express sirve dist/ + /api
npm run preview    # previsualiza el build de producción (con API)
npm run typecheck  # tsc --noEmit
npm run snapshot   # regenera src/data/snapshot.json desde la API real
```

## Estructura

```
├─ index.html                  # SEO básico, Open Graph, fuentes (Orbitron/Barlow/Inter)
├─ vite.config.ts              # plugin motogp-live-api (middleware /api en dev/preview)
├─ public/
│  ├─ robots.txt               # permisos a crawlers (si no, Vite/SPA sirve HTML)
│  └─ favicon.svg              # favicon "72" en SVG
├─ server/
│  ├─ api.mjs                  # proxy MotoGP: caché 30–60 s, dedupe, fallback stale, CORS
│  ├─ api.d.mts                # tipos del módulo JS para TS estricto
│  └─ index.mjs                # servidor Express de producción (estáticos + /api)
├─ scripts/fetch-snapshot.mjs  # genera el fallback offline desde la API real
├─ docs/                       # documentación del rediseño (equipo, contratos, decisiones)
│  ├─ TEAM.md                  # rondas, propiedad de archivos, incidencias QA y bitácora
│  ├─ CONTRACTS.md             # tokens, evento preloader:done, API de scroll, interfaces
│  └─ DECISIONS.md             # decisiones tomadas y limitaciones de verificación
└─ src/
   ├─ main.tsx                 # montaje de React (StrictMode)
   ├─ App.tsx                  # shell: preloader, barra de progreso, cursor, nav, Lenis, secciones
   ├─ index.css                # tema Tailwind 4 (paleta Aprilia, tokens, clases base, reduced-motion)
   ├─ styles/extras.css        # capas y efectos del rediseño (prefijo .x-)
   ├─ lib/scroll.ts            # Lenis + GSAP ScrollTrigger, scrollToSection, stopScroll
   ├─ data/
   │  ├─ api.ts                # capa de datos del cliente (fetch /api → localStorage → snapshot)
   │  ├─ content.ts            # copy estático: timeline, stats de carrera, galería, enlaces
   │  └─ snapshot.json         # fallback offline con datos reales de 2026
   └─ components/
      ├─ Preloader.tsx         # preloader de semáforo (emite preloader:done)
      ├─ ScrollProgress.tsx    # barra de progreso tipo circuito + marcador
      ├─ MagneticButton.tsx    # botones y CTA magnéticos (solo puntero fino)
      ├─ Hero3D.tsx            # hero a pantalla completa + escena R3F
      ├─ three/                # moto procedural, librea, partículas, glow y rig de cámara
      ├─ LiveScoreboard.tsx    # marcador cabina: odómetro, EN VIVO, estados y Top 5
      ├─ StatsCharts.tsx       # gráfica de evolución de puntos (Recharts)
      ├─ TiltCard.tsx          # tarjetas con efecto tilt 3D
      ├─ CareerStats.tsx       # sección #estadisticas (lazy: Recharts fuera del bundle base)
      ├─ Timeline.tsx          # trayectoria animada (GSAP ScrollTrigger, pin + scrub)
      ├─ Calendar.tsx          # calendario 2026 + cuenta atrás
      ├─ Gallery.tsx           # carrusel 3D + lightbox (Wikimedia Commons)
      ├─ SectionHeading.tsx    # encabezados de sección + Reveal
      └─ Footer.tsx            # redes oficiales, aviso legal y atribuciones
```

## Diseño · «recorrido por el circuito»

El rediseño convierte la página en un recorrido continuo, de la parrilla a la meta:

- **Preloader de semáforo**: al cargar se encienden las luces; al apagarse emite
  `preloader:done` —el evento del que dependen Lenis y la entrada del hero— y se retira
  del DOM (sin trampa de foco permanente).
- **Hero 3D reactivo**: moto procedural con la librea #72, partículas de velocidad y
  halo aditivo. La cámara responde al puntero y al progreso de scroll, y la moto entra
  al recibir `preloader:done`. Un tier `compact` (768–1100 px) reencuadra la escena
  para que el titular gigante no se coma la moto.
- **Scroll tipo circuito**: Lenis + GSAP, `pin`/`scrub` en la trayectoria, transiciones
  entre secciones y barra de progreso superior con marcador.
- **Marcador cabina**: *pit-board* con odómetro, chip de procedencia
  (directo/caché/snapshot), esqueleto de carga, estado de error reintentable y Top 5.
- **Trayectoria y calendario**: timeline con la moto recorriendo la línea y cuenta
  atrás en vivo de la próxima carrera (con el nombre de la última disputada).
- **Galería inmersiva**: carrusel *coverflow* con lightbox (trampa de foco, `Esc`) y
  atribuciones de Wikimedia Commons.
- **Microinteracciones**: cursor personalizado y botones magnéticos (solo en puntero
  fino). Todo el movimiento se desactiva con `prefers-reduced-motion`.

El proceso (rondas, propiedad de archivos, incidencias y decisiones) está documentado en
`docs/TEAM.md`, `docs/CONTRACTS.md` y `docs/DECISIONS.md`.

## Fuente de datos

La única fuente de verdad es la **API pública de MotoGP**
(`https://api.motogp.pulselive.com/motogp/v1/...`), sin token y sin claves. El proxy
(`server/api.mjs`) normaliza la respuesta a un contrato estable:

- `GET /api/standings` → `StandingsData` (clasificación, temporada, fin de semana activo)
- `GET /api/season` → `SeasonData` (22 rondas, resultados por ronda, evolución de puntos,
  poles/vueltas rápidas, próxima carrera)

**Caché en capas** (por si la API falla o cambia de forma):

1. **API viva** (TTL 30–60 s, y 15–20 s durante un fin de semana de carrera; dedupe de
   peticiones concurrentes y último resultado bueno si el upstream da error).
2. **localStorage** del navegador (`bz72:standings`, `bz72:season`).
3. **`src/data/snapshot.json`** embebido en el bundle, generado con datos reales de
   2026 (`npm run snapshot`).

El cliente (`src/data/api.ts`) no sabe de dónde vienen los datos: solo expone
`useLiveData()` con `source: 'live' | 'cache' | 'mock'`, `lastUpdated` y `refresh()`, y
hace **un único polling compartido** (60 s en calma, 15 s en fin de semana).

### ¿Cambiar la fuente de datos?

- **Recomendado:** sustituye el *upstream* dentro de `server/api.mjs` manteniendo la
  forma de `StandingsData`/`SeasonData`. El frontend no se entera.
- **Otra API propia:** cambia `API_BASE` y las rutas en `src/data/api.ts`.
- **Offline / demo:** regenera el snapshot con `npm run snapshot` (usa las rutas
  constantes de temporada/categoría ya fijadas).

## Rendimiento y accesibilidad

- 3D cargado con `lazy` + `Suspense` y *fallback*; `dpr` limitado a 1.75; sin HDR
  externos (reflexiones con `Environment`+`Lightformer` locales).
- Chunks separados: `three`, `charts`, `motion`, `react` (ver `manualChunks`).
- `prefers-reduced-motion` respetado en CSS, GSAP, Framer Motion y en la escena 3D.
- HTML semántico (`section`/`article`/`nav`), skip-link, `aria-live` solo donde aporta,
  foco visible, alt e imágenes `lazy`, cursor personalizado solo en puntero fino.
- Auditoría Lighthouse: **accesibilidad 100 · buenas prácticas 100 · SEO 100** (0 fallos).
- Verificado en runtime: 0 errores de consola recorriendo las 6 secciones y 0 px de
  desbordamiento horizontal (capturas de revisión en `%LOCALAPPDATA%\Temp\opencode\capturas\`).
- Aviso de build conocido: el chunk diferido `three` (~970 kB, gzip ~262 kB) supera el
  umbral de 900 kB; se carga con `lazy` solo para el hero y no bloquea el resto.
- **Ver animadas las animaciones**: si el sistema tiene desactivados los efectos de
  animación (Windows: *Configuración → Accesibilidad → Efectos visuales → Efectos de
  animación*), la web respeta esa preferencia y **no se mueve nada** (es lo correcto
  por accesibilidad). Para ver el sitio animado en ese equipo, abre la URL con
  **`?motion=full`** (la preferencia se recuerda; `?motion=system` la limpia y vuelve
  al ajuste del sistema).

## Despliegue

- **Vercel / Netlify**: build `npm run build`, output `dist/`, y añade un rewrite de
  `/api/*` hacia el proxy (o despliega `server/index.mjs` en un servicio Node). Sin
  proxy, la página sigue funcionando con el snapshot (modo `mock`).
- **Node completo**: `npm run build && npm start` (Express sirve `dist/` y `/api`).

## Contenido y licencias

- **Biografía y cifras de carrera**: Wikipedia (verificado en la ficha de Marco Bezzecchi).
- **Datos en vivo**: API pública de MotoGP / Pulselive.
- **Fotografías**: Wikimedia Commons, con autor y licencia visibles en la propia página
  (CC BY-SA 4.0 y CC BY 2.0). No se redistribuyen copias locales de las imágenes.
