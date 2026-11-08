import { Info, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../../stores/useGameStore';
import { unlockAudio } from '../../systems/audio/audioManager';
import { requestPointerLock } from '../../systems/movement/cameraState';
import { ControlsList } from './ControlsList';

export function StartScreen() {
  const start = useGameStore((s) => s.start);
  return (
    <div className="overlay overlay--start">
      <section className="panel start-panel" aria-labelledby="titulo-juego">
        <p className="eyebrow">Programación de Entornos Multimedia</p>
        <h1 id="titulo-juego">Villa Pastel</h1>
        <p className="lead">
          Una pequeña ciudad low-poly para recorrer a pie: calles, un parque con fuente, pelotas para patear y edificios a
          los que podrás entrar.
        </p>
        <button
          className="btn btn--primary btn--lg"
          onClick={() => {
            start();
            requestPointerLock();
            unlockAudio();
          }}
          autoFocus
        >
          <Play size={18} aria-hidden /> Comenzar
        </button>
        <div className="start-controls">
          <ControlsList compact />
        </div>
        <Link className="link-subtle" to="/acerca">
          <Info size={14} aria-hidden /> Acerca del proyecto
        </Link>
      </section>
    </div>
  );
}
