import { useEffect } from 'react';
import { useGameStore } from '../stores/useGameStore';
import { addCameraRotation, addCameraZoom, getGameCanvas, isPointerLocked, pointerLockInfo, requestPointerLock } from '../systems/movement/cameraState';
import { clientToNdc, pickBuilding } from '../systems/interaction/buildingPicker';
import { activateInteractable, pickInteractable } from '../systems/interaction/interactables';
import { bindKeyboard, resetInput } from '../systems/movement/input';

/**
 * Conecta teclado, mouse y rueda con el estado de entrada mientras se juega.
 * - Clic en el canvas: bloquea el puntero (mirar con el mouse, como en un videojuego).
 * - Sin bloqueo (o en táctil): arrastrar también gira la cámara.
 * - Si el navegador libera el puntero (Esc), el juego se pausa.
 */
export function usePlayerControls() {
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (phase !== 'playing') {
      resetInput();
      return;
    }
    const unbindKeys = bindKeyboard();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let hadLock = isPointerLocked();

    let downX = 0;
    let downY = 0;
    /** Selecciona un edificio interactivo bajo el punto indicado (o la mira si el puntero está capturado). */
    const trySelect = (clientX: number, clientY: number): boolean => {
      const canvas = getGameCanvas();
      if (!canvas) return false;
      const [x, y] = isPointerLocked() ? [0, 0] : clientToNdc(canvas, clientX, clientY);
      const store = useGameStore.getState();
      if (store.transition.active) return false;
      if (store.currentScene !== 'city') {
        const objectId = pickInteractable(x, y);
        if (!objectId) return false;
        activateInteractable(objectId);
        return true;
      }
      const hit = pickBuilding(x, y);
      if (!hit?.interactive) return false;
      store.selectBuilding(hit.buildingId);
      return true;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.target !== getGameCanvas()) return;
      dragging = true;
      lastX = downX = e.clientX;
      lastY = downY = e.clientY;
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const st = useGameStore.getState();
      if (st.selectedBuildingId || st.activeInteractionId) return;
      // Clic: primero intenta seleccionar un edificio; si no hay, captura el puntero para mirar
      if (!trySelect(e.clientX, e.clientY) && !isPointerLocked()) requestPointerLock();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (isPointerLocked()) {
        addCameraRotation(e.movementX, e.movementY);
        return;
      }
      if (!dragging) return;
      addCameraRotation((e.clientX - lastX) * 1.6, (e.clientY - lastY) * 1.6);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      // Toque corto en pantalla táctil = seleccionar
      if (dragging && e.pointerType === 'touch' && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
        const st = useGameStore.getState();
        if (!st.selectedBuildingId && !st.activeInteractionId) trySelect(e.clientX, e.clientY);
      }
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.target !== getGameCanvas()) return;
      addCameraZoom(Math.sign(e.deltaY) * 0.8);
    };
    const onLockChange = () => {
      const locked = isPointerLocked();
      if (hadLock && !locked) {
        pointerLockInfo.lastUnlock = performance.now();
        if (pointerLockInfo.intentional) pointerLockInfo.intentional = false;
        else if (useGameStore.getState().phase === 'playing') useGameStore.getState().pause();
      }
      hadLock = locked;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      unbindKeys();
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [phase]);

  // Al pausar o volver al menú se libera el puntero
  useEffect(() => {
    if (phase !== 'playing' && isPointerLocked()) document.exitPointerLock();
  }, [phase]);
}
