import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/**
 * Texturas procedurales de la moto (canvas 2D, sin assets externos ni HDR).
 * Todas se generan una vez y se liberan con `dispose()` desde `materials.ts`.
 */

/** Generador pseudoaleatorio determinista (misma textura en cada carga). */
function makeRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function finish(canvas: HTMLCanvasElement, repeat: number): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
}

/**
 * Tejido de carbono 2x2 (twill) sobre base casi negra: se usa como `map` del
 * carenado y de las piezas de fibra. El bajorrelieve del tejido lo aporta el
 * contraste entre celdas; el brillo final lo da el `clearcoat`.
 */
export function createCarbonTexture(repeat = 5): CanvasTexture {
  const { canvas, ctx } = createCanvas(256);
  const size = canvas.width;

  if (ctx) {
    const cells = 16;
    const cell = size / cells;

    ctx.fillStyle = '#08080b';
    ctx.fillRect(0, 0, size, size);

    for (let row = 0; row < cells; row += 1) {
      for (let col = 0; col < cells; col += 1) {
        const over = (row + col) % 4 < 2; // trama 2x2
        const x = col * cell;
        const y = row * cell;
        const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
        if (over) {
          grad.addColorStop(0, '#20202a');
          grad.addColorStop(0.5, '#141419');
          grad.addColorStop(1, '#0d0d11');
        } else {
          grad.addColorStop(0, '#141419');
          grad.addColorStop(0.5, '#0b0b0e');
          grad.addColorStop(1, '#060608');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cell, cell);

        // Reflejo del filamento en el borde de cada celda.
        ctx.strokeStyle = over ? 'rgba(246,246,248,0.06)' : 'rgba(246,246,248,0.025)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, y + 0.5);
        ctx.lineTo(x + cell - 0.5, y + 0.5);
        ctx.stroke();
      }
    }
  }

  return finish(canvas, repeat);
}

/** Caucho de neumático: negro mate con grano fino irregular. */
export function createRubberTexture(repeat = 4): CanvasTexture {
  const { canvas, ctx } = createCanvas(256);
  const size = canvas.width;
  const random = makeRandom(72);

  if (ctx) {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, size, size);

    const image = ctx.getImageData(0, 0, size, size);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (random() - 0.5) * 26;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain * 1.1));
    }
    ctx.putImageData(image, 0, 0);

    // Micro-surcos de rodadura (neumático slick desgastado).
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#f6f6f8';
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i += 1) {
      const y = random() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (random() - 0.5) * 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  return finish(canvas, repeat);
}

/**
 * Halo radial blanco con caída suave (128 px). Se usa como `map` de sprites y
 * planos **aditivos** para fingir un bloom ligero y el charco de luz de boxes
 * sin postprocesado externo: la caída la aporta el canal alfa del degradado.
 */
export function createGlowTexture(size = 128): CanvasTexture {
  const { canvas, ctx } = createCanvas(size);

  if (ctx) {
    const center = size / 2;
    const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.22, 'rgba(255,255,255,0.62)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    grad.addColorStop(0.78, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * Disco de freno ventilado: acero con orificios y ranuras radiales.
 * La UV de las tapas del cilindro es radial, así que el patrón circular
 * dibujado aquí encaja directamente sobre la cara del disco.
 */
export function createBrakeDiscTexture(repeat = 1): CanvasTexture {
  const { canvas, ctx } = createCanvas(256);
  const size = canvas.width;
  const center = size / 2;
  const half = center;
  const random = makeRandom(314);

  if (ctx) {
    const base = ctx.createRadialGradient(center, center, half * 0.05, center, center, half);
    base.addColorStop(0, '#2a2c33');
    base.addColorStop(0.45, '#565b66');
    base.addColorStop(0.8, '#7d838f');
    base.addColorStop(1, '#3d4149');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Banda de fricción.
    ctx.strokeStyle = 'rgba(246,246,248,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, half * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(center, center, half * 0.46, 0, Math.PI * 2);
    ctx.stroke();

    // Ranuras radiales.
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2 + random() * 0.1;
      ctx.strokeStyle = 'rgba(8,8,11,0.75)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(center, center, half * 0.7, angle, angle + 0.32);
      ctx.stroke();
    }

    // Orificios de refrigeración.
    for (let ring = 0; ring < 2; ring += 1) {
      const radius = half * (ring === 0 ? 0.62 : 0.8);
      const count = ring === 0 ? 18 : 20;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + ring * 0.09;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        ctx.fillStyle = '#101014';
        ctx.beginPath();
        ctx.arc(x, y, ring === 0 ? 5.4 : 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(246,246,248,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Zona del portadiscos (la cubre la pieza dorada).
    ctx.fillStyle = '#1b1d22';
    ctx.beginPath();
    ctx.arc(center, center, half * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  return finish(canvas, repeat);
}
