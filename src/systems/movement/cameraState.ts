import * as THREE from 'three';

/**
 * Orientación de la cámara en tercera persona (compartida entre cámara y personaje).
 * yaw = 0 → la cámara mira hacia −Z (norte); el personaje se mueve relativo a este ángulo.
 */
export const cameraState = {
  yaw: 0,
  pitch: 0.32,
  distance: 7,
  minDistance: 3,
  maxDistance: 13,
  minPitch: -0.25,
  maxPitch: 1.15,
  sensitivity: 0.0024,
  /** Si es true, la cámara salta a su posición sin suavizado (tras un teletransporte). */
  snap: false,
};

export function addCameraRotation(dx: number, dy: number) {
  cameraState.yaw -= dx * cameraState.sensitivity;
  cameraState.pitch = THREE.MathUtils.clamp(cameraState.pitch + dy * cameraState.sensitivity, cameraState.minPitch, cameraState.maxPitch);
}

export function addCameraZoom(delta: number) {
  cameraState.distance = THREE.MathUtils.clamp(cameraState.distance + delta, cameraState.minDistance, cameraState.maxDistance);
}

/** Puntero bloqueado (Pointer Lock API) sobre el canvas del juego. */
export function getGameCanvas(): HTMLCanvasElement | null {
  return document.querySelector('.game-canvas canvas');
}

export function requestPointerLock() {
  const canvas = getGameCanvas();
  if (!canvas || document.pointerLockElement === canvas) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // en táctil se arrastra
  try {
    const result = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
    result?.catch?.(() => undefined);
  } catch {
    /* el navegador puede rechazarlo si se pidió muy seguido */
  }
}

/** Momento en que se perdió el bloqueo del puntero (para no procesar dos veces la misma tecla Esc). */
export const pointerLockInfo = { lastUnlock: 0, intentional: false };

/** Libera el puntero a propósito (p. ej. para usar un panel) sin que el juego se pause. */
export function releasePointerLock() {
  if (!isPointerLocked()) return;
  pointerLockInfo.intentional = true;
  document.exitPointerLock();
}

export function isPointerLocked() {
  return document.pointerLockElement !== null && document.pointerLockElement === getGameCanvas();
}
