import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { cameraState } from '../movement/cameraState';

/** Duración de cada fundido (s). La UI usa la misma duración en CSS. */
export const FADE_SECONDS = 0.65;

/**
 * Orquesta la transición entre escenas (dentro del Canvas):
 *  - out: la cámara se acerca al personaje (efecto de "entrar") mientras la UI funde a negro.
 *         Al terminar, se cambia la escena (completeTransition).
 *  - loading: espera a que SceneManager monte la nueva escena (markSceneReady).
 *  - in: la cámara vuelve a su distancia mientras la UI quita el fundido.
 */
export function TransitionController() {
  const timer = useRef(0);
  const stageRef = useRef<string>('idle');
  const savedDistance = useRef(cameraState.distance);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const store = useGameStore.getState();
    const { stage } = store.transition;

    if (stage !== stageRef.current) {
      if (stage === 'out') savedDistance.current = cameraState.distance;
      stageRef.current = stage;
      timer.current = 0;
    }
    if (stage === 'idle') return;
    timer.current += delta;

    if (stage === 'out') {
      // Acercamiento suave de la cámara hacia el personaje
      cameraState.distance += (cameraState.minDistance - cameraState.distance) * (1 - Math.exp(-4 * delta));
      cameraState.pitch += (0.12 - cameraState.pitch) * (1 - Math.exp(-3 * delta));
      if (timer.current >= FADE_SECONDS) store.completeTransition();
    } else if (stage === 'in') {
      const target = Math.min(savedDistance.current, cameraState.maxDistance);
      cameraState.distance += (target - cameraState.distance) * (1 - Math.exp(-5 * delta));
      if (timer.current >= FADE_SECONDS) {
        cameraState.distance = target;
        store.finishTransition();
      }
    }
  });

  return null;
}
