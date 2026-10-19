import { CanvasTexture, SRGBColorSpace } from 'three';

const SIZE = 512;

/** Dibuja el livery del carenado: fondo carbón, bandas naranjas y el 72. */
function drawLivery(ctx: CanvasRenderingContext2D): void {
  const s = SIZE;

  const bg = ctx.createLinearGradient(0, 0, s, s);
  bg.addColorStop(0, '#16161c');
  bg.addColorStop(0.55, '#0b0b0e');
  bg.addColorStop(1, '#050507');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s, s);

  // Trama de fibra sutil (evita el fondo plano en los brillos).
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = '#f6f6f8';
  ctx.lineWidth = 1;
  for (let i = 0; i < s; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(s, i + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Bandas diagonales del livery (negro / rojo-naranja).
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(-0.5);

  ctx.fillStyle = 'rgba(246, 246, 248, 0.10)';
  ctx.fillRect(-s, -s * 0.44, s * 2, s * 0.022);

  ctx.fillStyle = '#ff4d00';
  ctx.fillRect(-s, s * 0.16, s * 2, s * 0.13);

  ctx.fillStyle = 'rgba(220, 60, 0, 0.65)';
  ctx.fillRect(-s, s * 0.32, s * 2, s * 0.05);

  ctx.fillStyle = 'rgba(255, 138, 61, 0.35)';
  ctx.fillRect(-s, s * 0.4, s * 2, s * 0.02);

  ctx.restore();

  // Número 72 en cursiva de competición.
  ctx.save();
  ctx.translate(s / 2, s * 0.46);
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  ctx.font = `900 ${Math.round(s * 0.56)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.lineWidth = s * 0.045;
  ctx.strokeStyle = 'rgba(5, 5, 7, 0.92)';
  ctx.strokeText('72', 0, 0);

  ctx.fillStyle = '#f6f6f8';
  ctx.fillText('72', 0, 0);

  ctx.lineWidth = s * 0.008;
  ctx.strokeStyle = 'rgba(255, 77, 0, 0.85)';
  ctx.strokeText('72', 0, 0);
  ctx.restore();

  // Nombre del piloto y equipo bajo el número.
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(s * 0.075)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ctx.fillStyle = 'rgba(246, 246, 248, 0.9)';
  ctx.fillText('BEZZECCHI', s / 2, s * 0.78);

  ctx.font = `600 ${Math.round(s * 0.058)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ctx.fillStyle = 'rgba(154, 154, 164, 0.85)';
  ctx.fillText('APRILIA RACING', s / 2, s * 0.88);
}

/**
 * Textura de carenado generada en canvas 2D (sin assets externos).
 * Se redibuja cuando las fuentes terminan de cargar para asegurar el
 * "72" en Barlow Condensed.
 */
export function createLiveryTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;

  const ctx = canvas.getContext('2d');
  if (ctx) drawLivery(ctx);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  if (typeof document !== 'undefined' && 'fonts' in document) {
    void document.fonts.ready.then(() => {
      const current = canvas.getContext('2d');
      if (current) {
        drawLivery(current);
        texture.needsUpdate = true;
      }
    });
  }

  return texture;
}
