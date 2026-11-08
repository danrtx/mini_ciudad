import { INTERIORS } from '../../data/interiors';
import { useGameStore } from '../../stores/useGameStore';
import { FADE_SECONDS } from '../../systems/transitions/TransitionController';

/** Fundido a negro entre escenas, con el nombre del lugar al que se llega. */
export function TransitionOverlay() {
  const { stage, target } = useGameStore((s) => s.transition);
  const visible = stage === 'out' || stage === 'loading';
  const label = target === 'city' ? 'Villa Pastel' : target ? INTERIORS[target].name : '';

  return (
    <div
      className={`transition-overlay${visible ? ' is-visible' : ''}`}
      style={{ transitionDuration: `${FADE_SECONDS}s` }}
      aria-hidden={!visible}
    >
      {stage !== 'idle' && <p className="transition-label">{label}</p>}
    </div>
  );
}
