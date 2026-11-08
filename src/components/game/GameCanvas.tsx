import { AdaptiveDpr, Preload } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense } from 'react';
import * as THREE from 'three';
import { SceneManager } from '../../scenes/SceneManager';
import { AudioSystem } from '../../systems/audio/AudioSystem';
import { FpsMeter } from '../../systems/FpsMeter';
import { InteractionSystem } from '../../systems/interaction/InteractionSystem';
import { TriggerSystem } from '../../systems/interaction/TriggerSystem';
import { useGameStore } from '../../stores/useGameStore';
import { CityColliders } from '../../systems/physics/CityColliders';
import { TransitionController } from '../../systems/transitions/TransitionController';
import { CameraRig } from './CameraRig';
import { Player } from './player/Player';

/** Con ?fisica en la URL se dibujan los colliders de Rapier (depuración). */
const PHYSICS_DEBUG = new URLSearchParams(window.location.search).has('fisica');

/**
 * Lienzo 3D principal: render, sombras, mundo físico (Rapier), escena activa y transiciones.
 * La ciudad no se monta hasta conocer el manifiesto de modelos (evita parpadeo procedural → GLB).
 */
export function GameCanvas() {
  const manifestLoaded = useGameStore((s) => s.manifestLoaded);
  const paused = useGameStore((s) => s.phase === 'paused');

  return (
    <Canvas
      className="game-canvas"
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ fov: 55, near: 0.2, far: 600, position: [-70, 55, -80] }}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Suspense fallback={null}>
        {manifestLoaded && (
          <Physics gravity={[0, -9.81, 0]} paused={paused} debug={PHYSICS_DEBUG}>
            <SceneManager />
            <CityColliders />
            <Player />
            <CameraRig />
            <InteractionSystem />
            <TransitionController />
            <AudioSystem />
            <TriggerSystem />
          </Physics>
        )}
        <Preload all />
      </Suspense>
      <FpsMeter />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
