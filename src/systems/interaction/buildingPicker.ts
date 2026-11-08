import * as THREE from 'three';

/**
 * Selección de edificios por Raycasting.
 * Cada edificio registra una caja "proxy" invisible con su volumen: el rayo se lanza contra
 * 10 cajas simples en lugar de miles de triángulos, y funciona igual con modelos GLB o procedurales.
 * Los edificios decorativos también se registran para que tapen a los que están detrás.
 */

const proxies: THREE.Object3D[] = [];
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

export const pickerContext = { camera: null as THREE.Camera | null };

export function registerBuildingProxy(object: THREE.Object3D): () => void {
  proxies.push(object);
  return () => {
    const i = proxies.indexOf(object);
    if (i >= 0) proxies.splice(i, 1);
  };
}

export interface PickResult {
  buildingId: string;
  interactive: boolean;
  distance: number;
}

/** Lanza un rayo desde la cámara por el punto NDC (x, y ∈ −1..1). (0, 0) = centro de la pantalla. */
export function pickBuilding(x: number, y: number, maxDistance = 55): PickResult | null {
  const camera = pickerContext.camera;
  if (!camera || proxies.length === 0) return null;
  raycaster.setFromCamera(ndc.set(x, y), camera);
  raycaster.far = maxDistance;
  const hit = raycaster.intersectObjects(proxies, false)[0];
  if (!hit) return null;
  const data = hit.object.userData as { buildingId?: string; interactive?: boolean };
  if (!data.buildingId) return null;
  return { buildingId: data.buildingId, interactive: Boolean(data.interactive), distance: hit.distance };
}

/** Convierte coordenadas de pantalla (clientX/Y) a NDC respecto a un elemento. */
export function clientToNdc(el: HTMLElement, clientX: number, clientY: number): [number, number] {
  const r = el.getBoundingClientRect();
  return [((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1];
}
