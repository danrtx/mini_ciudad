import type { BuildingStyle } from '../../../types/city';
import type { BoxInstance } from '../InstancedParts';

/** Altura del zócalo sobre el que se apoya el cuerpo del edificio. */
export const FOUNDATION_HEIGHT = 0.4;

export function roofHeight(style: BuildingStyle): number {
  switch (style.roof) {
    case 'gable':
      return style.depth * 0.38;
    case 'pyramid':
      return Math.min(style.width, style.depth) * 0.42;
    case 'dome':
      return Math.min(style.width, style.depth) * 0.6;
    default:
      return 0.5;
  }
}

function slots(length: number, spacing: number): number[] {
  const n = Math.max(1, Math.floor((length - 1.2) / spacing));
  const step = (length - 1.2) / n;
  return Array.from({ length: n }, (_, i) => -length / 2 + 0.6 + step * (i + 0.5));
}

/**
 * Calcula las ventanas (y sus alféizares) de las cuatro fachadas a partir del estilo.
 * La misma lógica la replica el script de Blender para que ambos modelos coincidan.
 */
export function computeWindows(style: BuildingStyle): { panes: BoxInstance[]; sills: BoxInstance[] } {
  const { width: w, depth: d, height: h, floors } = style;
  const floorH = h / floors;
  const paneH = Math.min(1.7, floorH * 0.5);
  const paneW = floors >= 5 ? 1.5 : 1.15;
  const spacing = floors >= 5 ? 2.1 : 2.5;
  const isShop = Boolean(style.awningColor);
  const panes: BoxInstance[] = [];
  const sills: BoxInstance[] = [];

  for (let f = 0; f < floors; f++) {
    const y = FOUNDATION_HEIGHT + f * floorH + floorH * 0.55;
    const groundShop = f === 0 && isShop;

    // Fachada frontal (+Z) y trasera (−Z)
    for (const side of [1, -1] as const) {
      const z = (side * d) / 2;
      if (groundShop && side === 1) {
        // Vitrinas amplias a ambos lados de la puerta
        const vitrinaW = Math.max(1.2, (w - 4) / 2 - 0.6);
        for (const sx of [-1, 1]) {
          const x = sx * (1.6 + vitrinaW / 2 + 0.3);
          panes.push({ position: [x, FOUNDATION_HEIGHT + 1.45, z], size: [vitrinaW, 2.1, 0.14] });
          sills.push({ position: [x, FOUNDATION_HEIGHT + 0.32, z + 0.08], size: [vitrinaW + 0.3, 0.14, 0.3] });
        }
        continue;
      }
      for (const x of slots(w, spacing)) {
        if (f === 0 && side === 1 && Math.abs(x) < 1.7) continue; // hueco de la puerta
        panes.push({ position: [x, y, z], size: [paneW, paneH, 0.14] });
        sills.push({ position: [x, y - paneH / 2 - 0.06, z + side * 0.1], size: [paneW + 0.3, 0.12, 0.26] });
      }
    }
    // Fachadas laterales (±X)
    for (const side of [1, -1] as const) {
      const x = (side * w) / 2;
      for (const z of slots(d, spacing)) {
        panes.push({ position: [x, y, z], size: [0.14, paneH, paneW] });
        sills.push({ position: [x + side * 0.1, y - paneH / 2 - 0.06, z], size: [0.26, 0.12, paneW + 0.3] });
      }
    }
  }
  return { panes, sills };
}
