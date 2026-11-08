import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';

/** Pantalla de carga: espera el manifiesto y los modelos GLB (si existen). */
export function LoadingScreen() {
  const { active, progress } = useProgress();
  const manifestLoaded = useGameStore((s) => s.manifestLoaded);
  const loading = !manifestLoaded || active;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      return;
    }
    const t = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(t);
  }, [loading]);

  if (!visible) return null;
  const pct = manifestLoaded ? Math.round(active ? progress : 100) : 5;
  return (
    <div className={`overlay overlay--loading${loading ? '' : ' is-leaving'}`} role="status" aria-live="polite">
      <div className="loader">
        <div className="loader-houses" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <p>Construyendo la ciudad… {pct}%</p>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
