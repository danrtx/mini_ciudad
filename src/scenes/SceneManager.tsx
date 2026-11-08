import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { Lighting } from '../components/game/Lighting';
import { CITY_CAMERA_MAX_DISTANCE, INTERIORS } from '../data/interiors';
import { useGameStore } from '../stores/useGameStore';
import { cameraState } from '../systems/movement/cameraState';
import { playerState } from '../systems/movement/playerState';
import { PhysicsToys } from '../systems/physics/PhysicsToys';
import type { InteriorId, SceneId } from '../types/city';
import { CityScene } from './city/CityScene';

/**
 * Interiores con carga diferida: su código (geometrías, colisiones, interacciones) se descarga
 * solo la primera vez que se entra, y se desmonta al salir (libera memoria de GPU).
 */
const INTERIOR_COMPONENTS: Record<InteriorId, LazyExoticComponent<ComponentType>> = {
  cafeteria: lazy(() => import('./interiors/CafeteriaInterior')),
  biblioteca: lazy(() => import('./interiors/LibraryInterior')),
};

/**
 * Se monta junto a la escena (después de sus colisiones). Coloca al personaje y avisa que la
 * escena está lista para quitar el fundido.
 */
function SceneReady({ scene }: { scene: SceneId }) {
  useEffect(() => {
    const store = useGameStore.getState();
    if (store.transition.stage !== 'loading') return; // carga inicial: no hay que mover a nadie

    if (scene === 'city') {
      cameraState.maxDistance = CITY_CAMERA_MAX_DISTANCE;
      // Al salir: la misma posición que tenía antes de entrar, mirando hacia afuera del edificio
      const saved = store.savedCityPosition;
      if (saved) playerState.teleport?.(saved, store.savedCityFacing + Math.PI);
    } else {
      const cfg = INTERIORS[scene];
      cameraState.maxDistance = cfg.cameraMaxDistance;
      cameraState.pitch = 0.38; // un poco más alta para ver la sala por encima del personaje
      const [ox, oy, oz] = cfg.origin;
      playerState.teleport?.([ox + cfg.spawn[0], oy + cfg.spawn[1], oz + cfg.spawn[2]], cfg.spawnFacing);
    }
    // Un fotograma de margen para que la escena se dibuje antes de quitar el fundido
    const id = requestAnimationFrame(() => useGameStore.getState().markSceneReady());
    return () => cancelAnimationFrame(id);
  }, [scene]);
  return null;
}

/**
 * Gestor de escenas:
 *  - La ciudad se mantiene SIEMPRE montada (se oculta dentro de un interior): no se pierde su estado
 *    (pelotas, cajas, relojes…) ni hay que reconstruirla al salir.
 *  - El interior activo se carga bajo demanda y es el único montado.
 */
export function SceneManager() {
  const currentScene = useGameStore((s) => s.currentScene);
  const inCity = currentScene === 'city';
  const Interior = inCity ? null : INTERIOR_COMPONENTS[currentScene];

  return (
    <>
      <group visible={inCity} name="escena-ciudad">
        <CityScene />
        <PhysicsToys />
      </group>
      {inCity && (
        <>
          <Lighting />
          <SceneReady scene="city" />
        </>
      )}
      {Interior && (
        <Suspense fallback={null}>
          <Interior />
          <SceneReady scene={currentScene} />
        </Suspense>
      )}
    </>
  );
}
