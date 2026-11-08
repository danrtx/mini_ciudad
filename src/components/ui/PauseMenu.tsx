import { Home, Play } from 'lucide-react';
import { useGameStore } from '../../stores/useGameStore';
import { unlockAudio } from '../../systems/audio/audioManager';
import { requestPointerLock } from '../../systems/movement/cameraState';
import { ControlsList } from './ControlsList';
import { VolumeControl } from './SoundToggle';
import { CITY_CAMERA_MAX_DISTANCE } from '../../data/interiors';
import { cameraState } from '../../systems/movement/cameraState';
import { PLAYER, playerState } from '../../systems/movement/playerState';

export function PauseMenu() {
  const resume = useGameStore((s) => s.resume);
  const backToMenu = useGameStore((s) => s.backToMenu);
  const goToMenu = () => {
    // Desde un interior, el menú vuelve a mostrar la ciudad con el personaje en su punto de partida
    if (useGameStore.getState().currentScene !== 'city') {
      useGameStore.setState({ currentScene: 'city' });
      cameraState.maxDistance = CITY_CAMERA_MAX_DISTANCE;
      playerState.teleport?.(PLAYER.spawn, PLAYER.spawnFacing);
    }
    backToMenu();
  };
  return (
    <div className="overlay overlay--dim">
      <section className="panel pause-panel" role="dialog" aria-modal="true" aria-labelledby="titulo-pausa">
        <h2 id="titulo-pausa">Pausa</h2>
        <div className="pause-actions">
          <button
            className="btn btn--primary"
            onClick={() => {
              resume();
              requestPointerLock();
              unlockAudio();
            }}
            autoFocus
          >
            <Play size={16} aria-hidden /> Reanudar
          </button>
          <button className="btn" onClick={goToMenu}>
            <Home size={16} aria-hidden /> Menú inicial
          </button>
        </div>
        <h3>Sonido</h3>
        <VolumeControl />
        <h3>Controles</h3>
        <ControlsList />
      </section>
    </div>
  );
}
