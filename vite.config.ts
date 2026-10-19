import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createApiHandler } from './server/api.mjs';

/**
 * En `npm run dev` la API corre como middleware dentro del propio Vite:
 * mismo proceso, mismo origen, cero CORS y sin scripts extra.
 * En producción la misma API corre en Express (`npm start` -> server/index.mjs).
 */
function motogpApiPlugin(): Plugin {
  const handler = createApiHandler();
  return {
    name: 'motogp-live-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), motogpApiPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('@react-three')) return 'three';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/framer-motion') || id.includes('node_modules/motion-')) return 'motion';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
