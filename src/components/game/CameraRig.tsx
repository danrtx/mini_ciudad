import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../stores/useGameStore';
import { ThirdPersonCamera } from '../../systems/movement/ThirdPersonCamera';

const MENU_TARGET = new THREE.Vector3(0, 0, 4);

/** Cámara "vitrina" del menú: gira sola alrededor de la ciudad. */
function MenuOrbit() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(-70, 55, -80);
  }, [camera]);
  return (
    <OrbitControls
      makeDefault
      target={MENU_TARGET}
      enableRotate={false}
      enableZoom={false}
      enablePan={false}
      autoRotate
      autoRotateSpeed={0.35}
      maxPolarAngle={Math.PI / 2.4}
    />
  );
}

/**
 * Gestor de cámara:
 *  - Menú: órbita automática.
 *  - Jugando / pausa: cámara en tercera persona que sigue al personaje (con colisión).
 */
export function CameraRig() {
  const inMenu = useGameStore((s) => s.phase === 'menu');
  return inMenu ? <MenuOrbit /> : <ThirdPersonCamera />;
}
