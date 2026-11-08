import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { attachListener, playSfx } from './audioManager';

/**
 * Conecta el audio con el juego (dentro del Canvas):
 *  - Pega el AudioListener a la cámara.
 *  - Reproduce efectos globales cuando cambia el estado: abrir un panel (clic) y
 *    entrar/salir de un edificio (campanita de puerta). Los objetos suenan desde activateInteractable.
 */
export function AudioSystem() {
  const camera = useThree((s) => s.camera);

  useEffect(() => attachListener(camera), [camera]);

  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        if (state.transition.stage === 'out' && prev.transition.stage !== 'out') playSfx('puerta');
        if (state.selectedBuildingId && state.selectedBuildingId !== prev.selectedBuildingId) playSfx('click');
      }),
    [],
  );

  return null;
}
