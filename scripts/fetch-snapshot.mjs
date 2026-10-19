/**
 * Genera src/data/snapshot.json a partir de la API real de MotoGP.
 *   npm run snapshot
 * Ese archivo es el fallback "offline" del frontend (capa de datos desacoplada):
 * si el proxy no responde y no hay caché local, se usan estos datos.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchSeason, fetchStandings } from '../server/api.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });

const [standings, season] = await Promise.all([fetchStandings(), fetchSeason()]);

// Reducimos a los 12 primeros + Bezzecchi para que el bundle pese poco.
const top = standings.riders.slice(0, 12);
const bez = standings.riders.find((r) => r.number === 72);
const riders = bez && !top.some((r) => r.number === 72) ? [...top, bez] : top;

const snapshot = {
  generatedAt: new Date().toISOString(),
  note: 'Snapshot generado con `npm run snapshot` desde la API pública de MotoGP. Sustitúyelo cuando cambie la fuente de datos.',
  standings: { ...standings, source: 'mock', riders },
  season,
};

const file = path.join(outDir, 'snapshot.json');
writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf8');
console.log(
  `✓ snapshot.json escrito (${snapshot.standings.riders.length} pilotos, ${snapshot.season.rounds.length} rondas) -> ${file}`,
);
