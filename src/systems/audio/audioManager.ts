import * as THREE from 'three';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Audio del juego (visto en la Semana 9):
 *  - Un único THREE.AudioListener pegado a la cámara ("los oídos").
 *  - THREE.PositionalAudio para sonidos anclados a objetos (la fuente): se atenúan con la distancia.
 *  - THREE.Audio para efectos globales de eventos (puerta, clic, triggers).
 * El navegador bloquea el audio hasta un gesto del usuario: unlockAudio() se llama al pulsar «Comenzar».
 */

export type SoundName = 'agua_fuente' | 'puerta' | 'campanitas' | 'click' | 'burbuja';

const FILES: Record<SoundName, string> = {
  agua_fuente: 'assets/audio/agua_fuente.wav',
  puerta: 'assets/audio/puerta.wav',
  campanitas: 'assets/audio/campanitas.wav',
  click: 'assets/audio/click.wav',
  burbuja: 'assets/audio/burbuja.wav',
};

const VOLUMES: Partial<Record<SoundName, number>> = { click: 0.35, puerta: 0.6, campanitas: 0.55, burbuja: 0.5 };
const STORAGE_KEY = 'villa-pastel-audio';

const loader = new THREE.AudioLoader();
const buffers = new Map<SoundName, Promise<AudioBuffer>>();
const globalSounds = new Map<SoundName, THREE.Audio>();

function readPrefs(): { muted: boolean; volume: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { muted: false, volume: 0.8, ...JSON.parse(raw) };
  } catch {
    /* almacenamiento no disponible */
  }
  return { muted: false, volume: 0.8 };
}

export const audioState = {
  listener: null as THREE.AudioListener | null,
  unlocked: false,
  ...readPrefs(),
};

// Acceso de depuración desde la consola (solo en desarrollo)
if (import.meta.env.DEV) Object.assign(window, { __audio: audioState });

const listeners = new Set<() => void>();
export function subscribeAudio(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function applyVolume() {
  audioState.listener?.setMasterVolume(audioState.muted ? 0 : audioState.volume);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted: audioState.muted, volume: audioState.volume }));
  } catch {
    /* sin almacenamiento: la preferencia solo dura esta sesión */
  }
  listeners.forEach((fn) => fn());
}

export function setMuted(muted: boolean) {
  audioState.muted = muted;
  applyVolume();
}

export function setVolume(volume: number) {
  audioState.volume = THREE.MathUtils.clamp(volume, 0, 1);
  if (audioState.volume > 0) audioState.muted = false;
  applyVolume();
}

export function loadSound(name: SoundName): Promise<AudioBuffer> {
  let p = buffers.get(name);
  if (!p) {
    p = loader.loadAsync(assetUrl(FILES[name]));
    buffers.set(name, p);
  }
  return p;
}

/** Crea el AudioListener y lo pega a la cámara. Devuelve la función de limpieza. */
export function attachListener(camera: THREE.Camera): () => void {
  const listener = new THREE.AudioListener();
  camera.add(listener);
  audioState.listener = listener;
  applyVolume();
  (Object.keys(FILES) as SoundName[]).forEach((n) => void loadSound(n).catch(() => undefined));
  return () => {
    globalSounds.forEach((s) => s.isPlaying && s.stop());
    globalSounds.clear();
    camera.remove(listener);
    audioState.listener = null;
  };
}

/** Desbloquea el AudioContext (debe llamarse dentro de un gesto del usuario). */
export function unlockAudio() {
  const ctx = THREE.AudioContext.getContext() as unknown as globalThis.AudioContext;
  if (ctx.state !== 'running') void ctx.resume();
  audioState.unlocked = true;
  listeners.forEach((fn) => fn());
}

/** Efecto global (no posicional). */
export function playSfx(name: SoundName) {
  const listener = audioState.listener;
  if (!listener || !audioState.unlocked) return;
  void loadSound(name)
    .then((buffer) => {
      let sound = globalSounds.get(name);
      if (!sound) {
        sound = new THREE.Audio(listener);
        sound.setBuffer(buffer);
        sound.setVolume(VOLUMES[name] ?? 0.6);
        globalSounds.set(name, sound);
      }
      if (sound.isPlaying) sound.stop();
      sound.play();
    })
    .catch(() => undefined);
}
