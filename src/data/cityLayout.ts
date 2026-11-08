import type { PropKind, PropTransform, RectXZ, StreetConfig, Vec3, ZoneConfig } from '../types/city';
import { buildingFootprint, rectContains } from '../utils/geometry2d';
import { createRandom } from '../utils/random';
import { BUILDINGS } from './buildings';

/**
 * Trazado urbano centralizado: calles, aceras, parque, mobiliario y zonas.
 * Unidades en metros. Y es arriba; el sur de la ciudad es +Z.
 *
 *            N (−Z)
 *   [Pinos]   |  Parque  |   [Torre]
 *   [Biblio]  |  Central |   [Panad.]
 *   [Cultura] |  (fuente)|   [Hotel]
 *  ===== Avenida del Sol (z = 18) =====
 *   [Celeste] [Café] [Mercado] [Girasol]
 */

export const GROUND_SIZE = 150;
export const SIDEWALK_HEIGHT = 0.2;
export const ROAD_Y = 0.02;
export const PARK_Y = 0.2;

export const STREETS: StreetConfig[] = [
  { id: 'avenida-sol', name: 'Avenida del Sol', rect: [-62, 14, 62, 22], axis: 'x', gaps: [[-22, -14], [-2, 2], [14, 22]] },
  { id: 'calle-robles', name: 'Calle de los Robles', rect: [-22, -62, -14, 14], axis: 'z', gaps: [[8.5, 14]] },
  { id: 'calle-puerto', name: 'Calle del Puerto', rect: [14, -62, 22, 14], axis: 'z', gaps: [[8.5, 14]] },
];

export const SIDEWALKS: RectXZ[] = [
  // Avenida del Sol — acera norte (interrumpida por las calles) y acera sur
  [-62, 12, -22, 14],
  [-14, 12, 14, 14],
  [22, 12, 62, 14],
  [-62, 22, 62, 24],
  // Calle de los Robles
  [-24, -62, -22, 12],
  [-14, -62, -12, 12],
  // Calle del Puerto
  [12, -62, 14, 12],
  [22, -62, 24, 12],
];

/** Pasos peatonales: rectángulo + orientación de las franjas. */
export const CROSSWALKS: { rect: RectXZ; stripesAlong: 'x' | 'z' }[] = [
  { rect: [-22, 9, -14, 12], stripesAlong: 'x' },
  { rect: [14, 9, 22, 12], stripesAlong: 'x' },
  { rect: [-1.8, 14, 1.8, 22], stripesAlong: 'z' },
];

export const PARK = {
  rect: [-12, -36, 12, 12] as RectXZ,
  fountainCenter: [0, PARK_Y, -4] as Vec3,
  plazaRadius: 7,
  paths: [
    [-1.6, -36, 1.6, 12],
    [-12, -5.6, 12, -2.4],
  ] as RectXZ[],
  gazebo: [6.5, PARK_Y, -22] as Vec3,
  flowerBeds: [
    [-6.5, PARK_Y, 6],
    [6.5, PARK_Y, 6],
    [7.5, PARK_Y, -11],
  ] as Vec3[],
};

/** Seto perimetral del parque con aberturas en la salida de cada sendero. */
export const HEDGES: RectXZ[] = [
  [-12, 11.4, -2.2, 12],
  [2.2, 11.4, 12, 12],
  [-12, -36, -2.2, -35.4],
  [2.2, -36, 12, -35.4],
  [-12, -35.4, -11.4, -6.2],
  [-12, -1.8, -11.4, 11.4],
  [11.4, -35.4, 12, -6.2],
  [11.4, -1.8, 12, 11.4],
];

// ---------------------------------------------------------------- Mobiliario
const p = (x: number, z: number, y = PARK_Y): Vec3 => [x, y, z];

const PARK_TREES: PropTransform[] = [
  [-8, -12], [-5, -17], [-9, -21], [-6.5, -28], [-9.5, -33], [-4, -32.5],
  [4.5, -15], [9.8, -14.5], [9.5, -30], [4.5, -31.5], [9.5, -26.5],
  [-9.5, 1.5], [-4.5, 9.5], [-9.5, 9.5],
  [9.5, 1.5], [4.5, 9.5], [9.5, 9.5],
].map(([x, z], i) => ({ position: p(x, z), rotationY: i * 1.3, scale: 0.9 + (i % 4) * 0.08 }));

const PARK_PINES: PropTransform[] = [[-4, -24], [-9.5, -16], [9.6, -19]].map(([x, z], i) => ({
  position: p(x, z),
  rotationY: i,
  scale: 1,
}));

function fountainRing(radius: number, angles: number[], faceCenter: boolean): PropTransform[] {
  const [cx, cy, cz] = PARK.fountainCenter;
  return angles.map((deg) => {
    const t = (deg * Math.PI) / 180;
    return {
      position: [cx + Math.sin(t) * radius, cy, cz + Math.cos(t) * radius] as Vec3,
      rotationY: faceCenter ? t + Math.PI : t,
    };
  });
}

const BENCHES: PropTransform[] = [
  ...fountainRing(6.1, [45, 135, 225, 315], true),
  { position: p(-2.4, -14), rotationY: Math.PI / 2 },
  { position: p(2.4, -26), rotationY: -Math.PI / 2 },
  { position: p(-2.4, 7), rotationY: Math.PI / 2 },
  { position: p(2.4, 7), rotationY: -Math.PI / 2 },
];

function lampsAlong(axis: 'x' | 'z', fixed: number, values: number[], rotationY: number): PropTransform[] {
  return values.map((v) => ({
    position: (axis === 'x' ? [v, SIDEWALK_HEIGHT, fixed] : [fixed, SIDEWALK_HEIGHT, v]) as Vec3,
    rotationY,
  }));
}

const LAMPS: PropTransform[] = [
  ...lampsAlong('x', 12.8, [-54, -42, -30, -7, 7, 30, 42, 54], 0),
  ...lampsAlong('x', 23.2, [-54, -42, -30, -16, -6, 6, 16, 30, 42, 54], Math.PI),
  ...lampsAlong('z', -23.2, [-54, -42, -30, -18, -2, 8], Math.PI / 2),
  ...lampsAlong('z', -12.8, [-54, -42, -30, -18, 0], -Math.PI / 2),
  ...lampsAlong('z', 12.8, [-54, -42, -30, -18, 0], Math.PI / 2),
  ...lampsAlong('z', 23.2, [-54, -42, -30, -18, -2, 8], -Math.PI / 2),
  { position: p(2.3, -12), rotationY: -Math.PI / 2 },
  { position: p(-2.3, -20), rotationY: Math.PI / 2 },
  { position: p(2.3, -32), rotationY: -Math.PI / 2 },
  { position: p(-2.3, 3), rotationY: Math.PI / 2 },
];

/** Árboles que rodean la ciudad: generados con semilla, evitando calles, edificios y parque. */
function generateOuterForest(): { trees: PropTransform[]; pines: PropTransform[] } {
  const rand = createRandom(1337);
  const blocked: RectXZ[] = [
    ...STREETS.map((s) => s.rect),
    ...SIDEWALKS,
    ...BUILDINGS.map(buildingFootprint),
    PARK.rect,
  ];
  const core: RectXZ = [-37, -42, 37, 39];
  const trees: PropTransform[] = [];
  const pines: PropTransform[] = [];
  const half = GROUND_SIZE / 2 - 4;
  let guard = 0;
  while (trees.length + pines.length < 150 && guard++ < 4000) {
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    if (rectContains(core, x, z) && rand() > 0.12) continue;
    if (blocked.some((r) => rectContains(r, x, z, 2.2))) continue;
    const item = { position: [x, 0, z] as Vec3, rotationY: rand() * Math.PI * 2, scale: 0.85 + rand() * 0.6 };
    (rand() > 0.55 ? pines : trees).push(item);
  }
  return { trees, pines };
}

function generateParkBushes(): PropTransform[] {
  const rand = createRandom(42);
  const out: PropTransform[] = [];
  const [x0, z0, x1, z1] = PARK.rect;
  let guard = 0;
  while (out.length < 34 && guard++ < 2000) {
    const x = x0 + 1.4 + rand() * (x1 - x0 - 2.8);
    const z = z0 + 1.4 + rand() * (z1 - z0 - 2.8);
    if (PARK.paths.some((r) => rectContains(r, x, z, 0.9))) continue;
    const [fx, , fz] = PARK.fountainCenter;
    if (Math.hypot(x - fx, z - fz) < PARK.plazaRadius + 0.8) continue;
    if (Math.hypot(x - PARK.gazebo[0], z - PARK.gazebo[2]) < 4) continue;
    if (PARK.flowerBeds.some((f) => Math.hypot(x - f[0], z - f[2]) < 3)) continue;
    out.push({ position: [x, PARK_Y, z], rotationY: rand() * 6, scale: 0.6 + rand() * 0.6 });
  }
  return out;
}

const forest = generateOuterForest();

export const PROPS: Record<Exclude<PropKind, 'fountain'>, PropTransform[]> = {
  tree: [...PARK_TREES, ...forest.trees],
  pine: [...PARK_PINES, ...forest.pines],
  bush: generateParkBushes(),
  lamp: LAMPS,
  bench: BENCHES,
};

// ---------------------------------------------------------------- Señalización
export interface StreetSignConfig {
  position: Vec3;
  rotationY: number;
  labels: [string, string];
}

export const STREET_SIGNS: StreetSignConfig[] = [
  { position: [-13, SIDEWALK_HEIGHT, 13], rotationY: 0, labels: ['Av. del Sol', 'C. de los Robles'] },
  { position: [13, SIDEWALK_HEIGHT, 13], rotationY: 0, labels: ['Av. del Sol', 'C. del Puerto'] },
];

export const TRAFFIC_LIGHTS: { position: Vec3; rotationY: number }[] = [
  { position: [-23.2, SIDEWALK_HEIGHT, 12.8], rotationY: Math.PI / 2 },
  { position: [23.2, SIDEWALK_HEIGHT, 12.8], rotationY: -Math.PI / 2 },
  { position: [2.6, SIDEWALK_HEIGHT, 23.2], rotationY: Math.PI },
];

export const PARKED_CARS: { position: Vec3; rotationY: number; color: string }[] = [
  { position: [-36, ROAD_Y, 20.6], rotationY: 0, color: '#ef7d6b' },
  { position: [-46, ROAD_Y, 20.6], rotationY: 0, color: '#7fb3e6' },
  { position: [38, ROAD_Y, 15.4], rotationY: Math.PI, color: '#f6c85f' },
  { position: [20.6, ROAD_Y, -38], rotationY: -Math.PI / 2, color: '#8ed1a5' },
  { position: [-15.4, ROAD_Y, -24], rotationY: Math.PI / 2, color: '#c7a0e8' },
];

export const CLOUDS: { position: Vec3; scale: number }[] = (() => {
  const rand = createRandom(7);
  return Array.from({ length: 14 }, () => ({
    position: [(rand() * 2 - 1) * 90, 38 + rand() * 14, (rand() * 2 - 1) * 90] as Vec3,
    scale: 2.4 + rand() * 2.8,
  }));
})();

// ---------------------------------------------------------------- Zonas (triggers)
export const ZONES: ZoneConfig[] = [
  { id: 'fuente', name: 'Fuente del Parque', kind: 'radial', center: PARK.fountainCenter, radius: 7, priority: 3 },
  { id: 'parque', name: 'Parque Central', kind: 'box', rect: PARK.rect, priority: 2 },
  ...STREETS.map((s) => ({ id: s.id, name: s.name, kind: 'box' as const, rect: s.rect, priority: 1 })),
  ...BUILDINGS.map((b) => ({
    id: `frente-${b.id}`,
    name: `Frente a ${b.name}`,
    kind: 'box' as const,
    rect: buildingFootprint(b).map((v, i) => v + (i < 2 ? -3 : 3)) as RectXZ,
    priority: 1,
  })),
];

export const DEFAULT_ZONE_NAME = 'Explorando la ciudad';
