import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../../data/palette';
import { useGameStore } from '../../stores/useGameStore';
import { playerState } from '../../systems/movement/playerState';

const SUN_OFFSET = new THREE.Vector3(30, 45, 20);
const SHADOW_HALF = 38;
const SHADOW_HALF_MENU = 72; // en el menú la cámara ve toda la ciudad
const SNAP = 4; // m: el sol se mueve a saltos para evitar el "temblor" de las sombras
const tmp = new THREE.Vector3();

/**
 * Iluminación cálida y económica: luz hemisférica + un único "sol" con sombras suaves.
 * El sol sigue al personaje: el mapa de sombras cubre ~76 m alrededor del jugador en vez de toda
 * la ciudad, con lo que las sombras son más nítidas con la misma resolución (2048²).
 * Las farolas usan materiales emisivos en lugar de luces dinámicas.
 */
export function Lighting() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const lastCenter = useRef(new THREE.Vector3(Infinity, 0, Infinity));
  const lastHalf = useRef(0);

  useFrame(() => {
    const sun = sunRef.current;
    if (!sun) return;
    const inMenu = useGameStore.getState().phase === 'menu';
    const half = inMenu ? SHADOW_HALF_MENU : SHADOW_HALF;
    if (half !== lastHalf.current) {
      lastHalf.current = half;
      const cam = sun.shadow.camera;
      cam.left = cam.bottom = -half;
      cam.right = cam.top = half;
      cam.updateProjectionMatrix();
    }
    if (playerState.object && !inMenu) playerState.object.getWorldPosition(tmp);
    else tmp.set(0, 0, 0);
    tmp.set(Math.round(tmp.x / SNAP) * SNAP, 0, Math.round(tmp.z / SNAP) * SNAP);
    if (tmp.equals(lastCenter.current)) return;
    lastCenter.current.copy(tmp);
    target.position.copy(tmp);
    target.updateMatrixWorld();
    sun.position.copy(tmp).add(SUN_OFFSET);
  });

  return (
    <>
      <color attach="background" args={[PALETTE.sky]} />
      <fog attach="fog" args={[PALETTE.fog, 70, 210]} />
      <hemisphereLight args={['#fff4e0', '#8fbf6a', 1.15]} />
      <ambientLight intensity={0.2} />
      <primitive object={target} />
      <directionalLight
        ref={sunRef}
        target={target}
        position={SUN_OFFSET.toArray()}
        intensity={2.3}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-near={5}
        shadow-camera-far={130}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
      />
    </>
  );
}
