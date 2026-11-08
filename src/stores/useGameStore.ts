import { create } from 'zustand';
import type { InteriorId, ModelManifest, SceneId, Vec3 } from '../types/city';

export type GamePhase = 'menu' | 'playing' | 'paused';
export type PlayerMotion = 'idle' | 'walk' | 'run' | 'air';

/**
 * Etapas de una transición entre escenas:
 *  out     → fundido a negro + acercamiento de cámara
 *  loading → cambio de escena (carga diferida del interior) y teletransporte del personaje
 *  in      → fundido de vuelta a la imagen
 */
export type TransitionStage = 'idle' | 'out' | 'loading' | 'in';

export interface Toast {
  id: number;
  title: string;
  text?: string;
}

export interface TransitionState {
  active: boolean;
  stage: TransitionStage;
  target: SceneId | null;
}

interface GameState {
  phase: GamePhase;
  currentScene: SceneId;
  selectedBuildingId: string | null;
  hoveredBuildingId: string | null;
  /** Edificio interactivo cuya entrada está cerca del personaje (tecla E). */
  nearbyBuildingId: string | null;
  transition: TransitionState;
  /** Posición/orientación del personaje en la ciudad al entrar a un interior (se restaura al salir). */
  savedCityPosition: Vec3 | null;
  savedCityFacing: number;
  /** Objetos interactivos de los interiores. */
  hoveredObjectId: string | null;
  nearbyObjectId: string | null;
  /** Objeto con su panel de información abierto. */
  activeInteractionId: string | null;
  /** Estado del personaje (solo cambia al pasar de una animación a otra, no por fotograma). */
  playerMotion: PlayerMotion;
  manifest: ModelManifest;
  manifestLoaded: boolean;
  /** Aviso breve en pantalla (triggers, eventos). */
  toast: Toast | null;

  start: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  backToMenu: () => void;
  selectBuilding: (id: string | null) => void;
  hoverBuilding: (id: string | null) => void;
  setNearbyBuilding: (id: string | null) => void;
  enterInterior: (interiorId: InteriorId, fromPosition: Vec3 | null, fromFacing: number) => void;
  returnToCity: () => void;
  /** Fin del fundido a negro: se cambia la escena. */
  completeTransition: () => void;
  /** La nueva escena ya está montada y el personaje colocado. */
  markSceneReady: () => void;
  /** Fin del fundido de entrada. */
  finishTransition: () => void;
  hoverObject: (id: string | null) => void;
  setNearbyObject: (id: string | null) => void;
  setActiveInteraction: (id: string | null) => void;
  setPlayerMotion: (motion: PlayerMotion) => void;
  setManifest: (manifest: ModelManifest) => void;
  showToast: (title: string, text?: string) => void;
  dismissToast: (id: number) => void;
}

const EMPTY_MANIFEST: ModelManifest = { buildings: {}, props: {}, characters: {} };
const IDLE_TRANSITION: TransitionState = { active: false, stage: 'idle', target: null };

const clearInteractions = {
  selectedBuildingId: null,
  hoveredBuildingId: null,
  nearbyBuildingId: null,
  hoveredObjectId: null,
  nearbyObjectId: null,
  activeInteractionId: null,
};

export const useGameStore = create<GameState>()((set, get) => ({
  phase: 'menu',
  currentScene: 'city',
  selectedBuildingId: null,
  hoveredBuildingId: null,
  nearbyBuildingId: null,
  transition: IDLE_TRANSITION,
  savedCityPosition: null,
  savedCityFacing: 0,
  hoveredObjectId: null,
  nearbyObjectId: null,
  activeInteractionId: null,
  playerMotion: 'idle',
  manifest: EMPTY_MANIFEST,
  manifestLoaded: false,
  toast: null,

  start: () => set({ phase: 'playing' }),
  pause: () => get().phase === 'playing' && set({ phase: 'paused' }),
  resume: () => get().phase === 'paused' && set({ phase: 'playing' }),
  togglePause: () => {
    const { phase } = get();
    if (phase === 'playing') set({ phase: 'paused' });
    else if (phase === 'paused') set({ phase: 'playing' });
  },
  backToMenu: () => set({ phase: 'menu', ...clearInteractions }),

  selectBuilding: (id) => set({ selectedBuildingId: id }),
  hoverBuilding: (id) => get().hoveredBuildingId !== id && set({ hoveredBuildingId: id }),
  setNearbyBuilding: (id) => get().nearbyBuildingId !== id && set({ nearbyBuildingId: id }),

  enterInterior: (interiorId, fromPosition, fromFacing) => {
    if (get().transition.active) return;
    set({
      transition: { active: true, stage: 'out', target: interiorId },
      savedCityPosition: fromPosition,
      savedCityFacing: fromFacing,
      ...clearInteractions,
    });
  },
  returnToCity: () => {
    if (get().transition.active || get().currentScene === 'city') return;
    set({ transition: { active: true, stage: 'out', target: 'city' }, ...clearInteractions });
  },
  completeTransition: () => {
    const { transition } = get();
    if (transition.stage !== 'out' || !transition.target) return;
    set({ currentScene: transition.target, transition: { ...transition, stage: 'loading' }, ...clearInteractions });
  },
  markSceneReady: () => {
    const { transition } = get();
    if (transition.stage === 'loading') set({ transition: { ...transition, stage: 'in' } });
  },
  finishTransition: () => set({ transition: IDLE_TRANSITION }),

  hoverObject: (id) => get().hoveredObjectId !== id && set({ hoveredObjectId: id }),
  setNearbyObject: (id) => get().nearbyObjectId !== id && set({ nearbyObjectId: id }),
  setActiveInteraction: (id) => set({ activeInteractionId: id }),
  setPlayerMotion: (motion) => get().playerMotion !== motion && set({ playerMotion: motion }),
  setManifest: (manifest) => set({ manifest, manifestLoaded: true }),
  showToast: (title, text) => set({ toast: { id: Date.now(), title, text } }),
  dismissToast: (id) => get().toast?.id === id && set({ toast: null }),
}));

/** ¿Hay algo que deba congelar al personaje (panel abierto, transición, pausa)? */
export function isPlayerFrozen(s: GameState = useGameStore.getState()): boolean {
  return s.phase !== 'playing' || s.transition.active || s.selectedBuildingId !== null || s.activeInteractionId !== null;
}
