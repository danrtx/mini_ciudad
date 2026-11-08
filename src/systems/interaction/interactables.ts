import * as THREE from 'three';
import { useGameStore } from '../../stores/useGameStore';
import { playSfx } from '../audio/audioManager';
import { pickerContext } from './buildingPicker';

/**
 * Registro genérico de objetos interactivos (mostrador, máquina de café, libros, puerta…).
 * Cualquier escena registra objetos con <Interactable>; el motor (InteractionSystem) solo
 * consulta este registro, así se agregan interacciones nuevas sin modificarlo.
 */
export interface InteractableEntry {
  id: string;
  name: string;
  /** Verbo que se muestra en el indicador: «E · Usar Máquina de café». */
  verb: string;
  description?: string;
  details?: Record<string, string>;
  /** Caja invisible para el raycasting. */
  proxy: THREE.Object3D;
  /** Punto (mundo) para el trigger de proximidad. */
  point: THREE.Vector3;
  radius: number;
  /** Acción propia del objeto (animación, encender una luz, salir…). */
  onActivate?: () => void;
}

const registry = new Map<string, InteractableEntry>();
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const proxyList: THREE.Object3D[] = [];

export function registerInteractable(entry: InteractableEntry): () => void {
  registry.set(entry.id, entry);
  proxyList.push(entry.proxy);
  return () => {
    registry.delete(entry.id);
    const i = proxyList.indexOf(entry.proxy);
    if (i >= 0) proxyList.splice(i, 1);
  };
}

export function getInteractable(id: string | null): InteractableEntry | undefined {
  return id ? registry.get(id) : undefined;
}

export function allInteractables(): Iterable<InteractableEntry> {
  return registry.values();
}

/** Raycasting contra los objetos registrados (NDC, (0,0) = centro). */
export function pickInteractable(x: number, y: number, maxDistance = 14): string | null {
  const camera = pickerContext.camera;
  if (!camera || proxyList.length === 0) return null;
  raycaster.setFromCamera(ndc.set(x, y), camera);
  raycaster.far = maxDistance;
  const hit = raycaster.intersectObjects(proxyList, false)[0];
  return (hit?.object.userData.interactableId as string | undefined) ?? null;
}

/** Ejecuta la acción del objeto y, si tiene descripción, abre su panel de información. */
export function activateInteractable(id: string) {
  const entry = registry.get(id);
  if (!entry) return;
  playSfx('click');
  entry.onActivate?.();
  if (entry.description) useGameStore.getState().setActiveInteraction(id);
}
