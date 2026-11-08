import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from '../../../data/palette';
import type { PropKind } from '../../../types/city';
import { GEO, getMaterial } from '../../../utils/sharedResources';
import type { InstancedPart } from '../InstancedParts';

/**
 * Modelos procedurales de respaldo para el mobiliario urbano.
 * Cada prop se describe como piezas (geometría ya transformada + material) que se instancian.
 * Cuando Blender exporte el GLB correspondiente, se usan sus mallas en lugar de estas.
 */

interface BakeOptions {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();

function bake(base: THREE.BufferGeometry, { position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0] }: BakeOptions) {
  const g = base.index ? base.toNonIndexed() : base.clone();
  q.setFromEuler(e.set(...rotation));
  m.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
  g.applyMatrix4(m);
  // Normalizamos atributos para poder fusionar geometrías de distinto origen.
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  g.computeVertexNormals();
  return g;
}

function merge(...geos: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error('No se pudieron fusionar las geometrías del prop');
  return merged;
}

const white = () => getMaterial('#ffffff');

function treeParts(): InstancedPart[] {
  return [
    { geometry: bake(GEO.cylinder6, { position: [0, 0.8, 0], scale: [0.45, 1.6, 0.45] }), material: getMaterial(PALETTE.trunk) },
    {
      geometry: merge(
        bake(GEO.ico, { position: [0, 2.6, 0], scale: [2.7, 2.4, 2.7] }),
        bake(GEO.ico, { position: [0.45, 3.5, -0.2], scale: [1.7, 1.6, 1.7], rotation: [0.4, 0.8, 0] }),
      ),
      material: white(),
      tints: PALETTE.leaves,
    },
  ];
}

function pineParts(): InstancedPart[] {
  return [
    { geometry: bake(GEO.cylinder6, { position: [0, 0.5, 0], scale: [0.4, 1, 0.4] }), material: getMaterial(PALETTE.trunk) },
    {
      geometry: merge(
        bake(GEO.cone6, { position: [0, 1.9, 0], scale: [2.8, 2.1, 2.8] }),
        bake(GEO.cone6, { position: [0, 3.1, 0], scale: [2.1, 1.8, 2.1], rotation: [0, 0.5, 0] }),
        bake(GEO.cone6, { position: [0, 4.15, 0], scale: [1.4, 1.5, 1.4] }),
      ),
      material: white(),
      tints: PALETTE.pine,
    },
  ];
}

function bushParts(): InstancedPart[] {
  return [
    {
      geometry: merge(
        bake(GEO.ico, { position: [0, 0.5, 0], scale: [1.6, 1.15, 1.6] }),
        bake(GEO.ico, { position: [0.5, 0.45, 0.35], scale: [1, 0.8, 1], rotation: [0.3, 1, 0] }),
      ),
      material: white(),
      tints: PALETTE.bush,
    },
  ];
}

function lampParts(): InstancedPart[] {
  const metal = getMaterial(PALETTE.metal, { roughness: 0.5, metalness: 0.4 });
  return [
    {
      geometry: merge(
        bake(GEO.cylinder8, { position: [0, 0.15, 0], scale: [0.4, 0.3, 0.4] }),
        bake(GEO.cylinder8, { position: [0, 2.1, 0], scale: [0.16, 4.2, 0.16] }),
        bake(GEO.box, { position: [0, 4.15, 0.45], scale: [0.1, 0.1, 1] }),
        bake(GEO.box, { position: [0, 4.05, 0.95], scale: [0.5, 0.2, 0.65] }),
      ),
      material: metal,
    },
    {
      geometry: bake(GEO.box, { position: [0, 3.93, 0.95], scale: [0.38, 0.06, 0.5] }),
      material: getMaterial(PALETTE.lampLight, { emissive: PALETTE.lampLight, emissiveIntensity: 1.2 }),
      castShadow: false,
    },
  ];
}

function benchParts(): InstancedPart[] {
  return [
    {
      geometry: merge(
        bake(GEO.box, { position: [0, 0.5, 0], scale: [1.9, 0.1, 0.55] }),
        bake(GEO.box, { position: [0, 0.88, -0.27], scale: [1.9, 0.42, 0.08], rotation: [-0.15, 0, 0] }),
      ),
      material: getMaterial(PALETTE.wood),
    },
    {
      geometry: merge(
        bake(GEO.box, { position: [-0.78, 0.25, 0], scale: [0.1, 0.5, 0.5] }),
        bake(GEO.box, { position: [0.78, 0.25, 0], scale: [0.1, 0.5, 0.5] }),
      ),
      material: getMaterial(PALETTE.metal),
    },
  ];
}

const builders: Record<Exclude<PropKind, 'fountain'>, () => InstancedPart[]> = {
  tree: treeParts,
  pine: pineParts,
  bush: bushParts,
  lamp: lampParts,
  bench: benchParts,
};

const cache = new Map<string, InstancedPart[]>();

export function getProceduralPropParts(kind: Exclude<PropKind, 'fountain'>): InstancedPart[] {
  let parts = cache.get(kind);
  if (!parts) {
    parts = builders[kind]();
    cache.set(kind, parts);
  }
  return parts;
}
