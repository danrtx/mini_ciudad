import * as THREE from 'three';

interface TextTextureOptions {
  background: string;
  color: string;
  width?: number;
  height?: number;
  fontWeight?: number;
}

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Crea una textura con texto dibujado en un <canvas>.
 * Sirve para letreros de tiendas y señales de calles sin descargar fuentes externas.
 */
export function getTextTexture(text: string, opts: TextTextureOptions): THREE.CanvasTexture {
  const { background, color, width = 512, height = 128, fontWeight = 800 } = opts;
  const key = `${text}|${background}|${color}|${width}x${height}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = height * 0.06;
  ctx.strokeRect(height * 0.08, height * 0.08, width - height * 0.16, height - height * 0.16);
  ctx.globalAlpha = 1;

  let size = height * 0.5;
  ctx.font = `${fontWeight} ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  while (ctx.measureText(text).width > width * 0.86 && size > 10) {
    size -= 2;
    ctx.font = `${fontWeight} ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}
