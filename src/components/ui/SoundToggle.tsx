import { Volume2, VolumeX } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { audioState, setMuted, setVolume, subscribeAudio } from '../../systems/audio/audioManager';

function useAudioPrefs() {
  return useSyncExternalStore(
    (cb) => subscribeAudio(cb),
    () => `${audioState.muted}|${audioState.volume}`,
  );
}

/** Botón de silencio para el HUD. */
export function SoundToggle() {
  useAudioPrefs();
  const muted = audioState.muted || audioState.volume === 0;
  return (
    <button
      className="btn btn--icon hud-sound"
      onClick={() => setMuted(!audioState.muted)}
      aria-label={muted ? 'Activar sonido' : 'Silenciar'}
      title={muted ? 'Activar sonido' : 'Silenciar'}
      aria-pressed={muted}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

/** Control de volumen para el menú de pausa. */
export function VolumeControl() {
  useAudioPrefs();
  const muted = audioState.muted;
  return (
    <div className="volume-control">
      <button className="btn btn--icon btn--ghost" onClick={() => setMuted(!muted)} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
        {muted || audioState.volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <label className="volume-slider">
        <span>Volumen</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : audioState.volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
