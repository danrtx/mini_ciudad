import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BUILDINGS } from '../../data/buildings';
import { isPlayerFrozen, useGameStore } from '../../stores/useGameStore';
import { doorPoint } from '../../utils/geometry2d';
import { isPointerLocked } from '../movement/cameraState';
import { input } from '../movement/input';
import { playerState } from '../movement/playerState';
import { pickBuilding, pickerContext } from './buildingPicker';
import { activateInteractable, allInteractables, pickInteractable } from './interactables';

/** Radio (m) del trigger de proximidad frente a la puerta (distanceTo, como en clase). */
export const PROXIMITY_RADIUS = 3.2;

const playerPos = new THREE.Vector3();
const touchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Sistema de interacción con edificios (dentro del Canvas):
 *  1. Raycasting: qué edificio está bajo la mira (puntero capturado) o bajo el cursor del mouse.
 *  2. Proximidad: qué entrada interactiva tiene el personaje a menos de PROXIMITY_RADIUS.
 *  3. Tecla E: abre el panel del edificio cercano.
 * Dentro de un interior hace lo mismo con los objetos del registro genérico (interactables).
 * Solo escribe en Zustand cuando el resultado cambia (no por fotograma).
 */
export function InteractionSystem() {
  const camera = useThree((s) => s.camera);
  const pointer = useThree((s) => s.pointer);
  const frame = useRef(0);
  const interactLatch = useRef(false);

  const doors = useMemo(
    () =>
      BUILDINGS.filter((b) => b.interactive).map((b) => {
        const [x, z] = doorPoint(b, b.style.columns ? 3.9 : 1.6);
        return { id: b.id, point: new THREE.Vector3(x, 0, z) };
      }),
    [],
  );

  useEffect(() => {
    pickerContext.camera = camera;
    return () => {
      pickerContext.camera = null;
    };
  }, [camera]);

  useFrame(() => {
    const store = useGameStore.getState();
    const active = !isPlayerFrozen(store);
    const inCity = store.currentScene === 'city';

    // --- Tecla E (flanco de subida): edificio cercano en la ciudad u objeto cercano en un interior
    if (!input.interact) interactLatch.current = false;
    else if (!interactLatch.current) {
      interactLatch.current = true;
      if (active && inCity && store.nearbyBuildingId) store.selectBuilding(store.nearbyBuildingId);
      else if (active && !inCity) {
        const target = store.hoveredObjectId ?? store.nearbyObjectId;
        if (target) activateInteractable(target);
      }
    }

    if (!active) {
      if (store.hoveredBuildingId) store.hoverBuilding(null);
      if (store.hoveredObjectId) store.hoverObject(null);
      return;
    }

    // --- Raycasting cada 2 fotogramas: suficiente para la UI y la mitad de coste
    frame.current = (frame.current + 1) % 2;
    if (frame.current === 0) {
      const centered = isPointerLocked() || touchDevice;
      const x = centered ? 0 : pointer.x;
      const y = centered ? 0 : pointer.y;
      if (inCity) store.hoverBuilding(pickBuilding(x, y)?.buildingId ?? null);
      else store.hoverObject(pickInteractable(x, y));
    }

    // --- Proximidad (trigger radial con distanceTo)
    const player = playerState.object;
    if (!player) return;
    player.getWorldPosition(playerPos);
    playerPos.y = 0;
    if (inCity) {
      let nearest: string | null = null;
      let best = PROXIMITY_RADIUS;
      for (const door of doors) {
        const d = playerPos.distanceTo(door.point);
        if (d < best) {
          best = d;
          nearest = door.id;
        }
      }
      store.setNearbyBuilding(nearest);
    } else {
      let nearest: string | null = null;
      let best = Infinity;
      for (const entry of allInteractables()) {
        const d = playerPos.distanceTo(entry.point);
        if (d < entry.radius && d < best) {
          best = d;
          nearest = entry.id;
        }
      }
      store.setNearbyObject(nearest);
    }
  });

  return null;
}
