import type { BuildingConfig, RectXZ } from '../types/city';

export function rectContains(rect: RectXZ, x: number, z: number, margin = 0): boolean {
  return x >= rect[0] - margin && x <= rect[2] + margin && z >= rect[1] - margin && z <= rect[3] + margin;
}

export function rectCenter(rect: RectXZ): [number, number] {
  return [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2];
}

export function rectSize(rect: RectXZ): [number, number] {
  return [rect[2] - rect[0], rect[3] - rect[1]];
}

/** Huella AABB de un edificio en el mundo (considera rotaciones de 90°). */
export function buildingFootprint(b: BuildingConfig): RectXZ {
  const turned = Math.abs(Math.sin(b.rotationY)) > 0.5;
  const halfX = (turned ? b.style.depth : b.style.width) / 2;
  const halfZ = (turned ? b.style.width : b.style.depth) / 2;
  const [x, , z] = b.position;
  return [x - halfX, z - halfZ, x + halfX, z + halfZ];
}

/** Dirección (x, z) hacia la que mira la fachada de un edificio. */
export function facingDirection(rotationY: number): [number, number] {
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

/** Punto (x, z) frente a la puerta de un edificio, a `distance` metros de la fachada. */
export function doorPoint(b: BuildingConfig, distance = 1.4): [number, number] {
  const [dx, dz] = facingDirection(b.rotationY);
  const reach = b.style.depth / 2 + distance;
  return [b.position[0] + dx * reach, b.position[2] + dz * reach];
}
