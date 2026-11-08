import { useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { loadModelManifest } from '../systems/assets/modelManifest';
import { pointerLockInfo } from '../systems/movement/cameraState';

/** Carga el manifiesto de modelos una sola vez y registra la tecla Esc para pausar. */
export function useGameBootstrap() {
  useEffect(() => {
    if (useGameStore.getState().manifestLoaded) return;
    let cancelled = false;
    loadModelManifest().then((m) => !cancelled && useGameStore.getState().setManifest(m));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Con un panel abierto, Esc solo lo cierra
      const st = useGameStore.getState();
      if (st.selectedBuildingId || st.activeInteractionId) {
        st.selectBuilding(null);
        st.setActiveInteraction(null);
        return;
      }
      // Si esa misma Esc liberó el puntero, la pausa ya la hizo el evento pointerlockchange
      if (performance.now() - pointerLockInfo.lastUnlock < 400) return;
      useGameStore.getState().togglePause();
    };
    // Pausa automática al cambiar de pestaña o minimizar (ahorra batería y GPU)
    const onVisibility = () => {
      if (document.hidden) useGameStore.getState().pause();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
