import * as THREE from 'three';

/**
 * Geometrías y materiales reutilizables.
 * Todas las piezas low-poly comparten unas pocas geometrías unitarias que se escalan,
 * y los materiales se cachean por color: decenas de edificios = pocos objetos en GPU.
 */

function gableRoofGeometry(): THREE.BufferGeometry {
  // Prisma triangular unitario: ancho 1 (X), fondo 1 (Z), alto 1 (Y desde 0); cumbrera paralela a X.
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  geo.translate(0, 0, -0.5);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function pyramidGeometry(): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 0.5, 0);
  return geo;
}

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  /** Caja con la base en y = 0 (útil para escalar en altura). */
  boxBase: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  cylinder6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cylinder8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cylinder12: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cone6: new THREE.ConeGeometry(0.5, 1, 6),
  cone8: new THREE.ConeGeometry(0.5, 1, 8),
  ico: new THREE.IcosahedronGeometry(0.5, 0),
  ico1: new THREE.IcosahedronGeometry(0.5, 1),
  dome: new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  gable: gableRoofGeometry(),
  pyramid: pyramidGeometry(),
  plane: new THREE.PlaneGeometry(1, 1),
};

interface MaterialOptions {
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/** Devuelve (y cachea) un MeshStandardMaterial con sombreado plano. */
export function getMaterial(color: string, opts: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${JSON.stringify(opts)}`;
  let mat = materialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: opts.roughness ?? 0.85,
      metalness: opts.metalness ?? 0,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
    materialCache.set(key, mat);
  }
  return mat;
}

/** Material de ventana: ligeramente emisivo para que las fachadas tengan vida. */
export function getWindowMaterial(color: string): THREE.MeshStandardMaterial {
  return getMaterial(color, { emissive: color, emissiveIntensity: 0.18, roughness: 0.25, metalness: 0.1 });
}
