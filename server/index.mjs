/**
 * Servidor de producción: sirve la build estática de Vite + el proxy /api.
 *   npm run build && npm start
 * Flags:
 *   --api-only   solo la API (útil como función serverless / worker separado)
 * Variables:
 *   PORT         puerto (4173 por defecto)
 *   SEASON_YEAR  temporada a consultar (2026 por defecto)
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiHandler } from './api.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', 'dist');
const apiOnly = process.argv.includes('--api-only');
const port = Number(process.env.PORT || 4173);

const app = express();
app.disable('x-powered-by');
app.set('etag', false);

// 1) API primero (el handler resuelve /api/... aunque se monte con prefijo)
app.use('/api', createApiHandler());

if (!apiOnly) {
  // 2) Assets con caché larga; index.html sin caché para que siempre haya HTML nuevo
  app.use(express.static(dist, { index: false, maxAge: '1y', immutable: true }));
  app.use((req, res) => {
    res.setHeader('cache-control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) res.status(404).type('text/plain').send('Ejecuta `npm run build` antes de `npm start`.');
    });
  });
}

app.listen(port, () => {
  console.log(`▸ Bezzecchi #72 listo en http://localhost:${port}${apiOnly ? ' (solo API)' : ''}`);
});
