import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cameraState } from './cameraState';
import { playerState } from './playerState';

const HEAD_HEIGHT = 0.75; // sobre el centro de la cápsula
const CAMERA_PADDING = 0.3;

const pivot = new THREE.Vector3();
const desired = new THREE.Vector3();
const offsetDir = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

/**
 * Cámara en tercera persona:
 *  - Orbita alrededor de la cabeza del personaje según yaw/pitch (mouse) y distancia (rueda).
 *  - Lanza un rayo de Rapier desde la cabeza hacia la cámara: si choca con un edificio u
 *    obstáculo, la cámara se acerca para no atravesar paredes.
 *  - Sigue al personaje con amortiguación exponencial (independiente de los FPS).
 */
export function ThirdPersonCamera() {
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }), [rapier]);
  const currentDistance = useRef(cameraState.distance);
  const smoothedPivot = useRef<THREE.Vector3 | null>(null);
  const elapsed = useRef(0);
  // Se incluyen sensores: las copas de los árboles son sensores que solo frenan a la cámara
  const filterFlags = rapier.QueryFilterFlags.EXCLUDE_DYNAMIC;

  useFrame((_, rawDelta) => {
    const target = playerState.object;
    if (!target) return;
    const delta = Math.min(rawDelta, 0.1);

    target.getWorldPosition(pivot);
    pivot.y += HEAD_HEIGHT;
    if (!smoothedPivot.current) smoothedPivot.current = pivot.clone();
    const snap = cameraState.snap;
    if (snap) {
      smoothedPivot.current.copy(pivot);
      currentDistance.current = Math.min(cameraState.distance, cameraState.maxDistance);
    }
    smoothedPivot.current.lerp(pivot, 1 - Math.exp(-18 * delta));
    const p = smoothedPivot.current;

    const { yaw, pitch } = cameraState;
    offsetDir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).normalize();

    // Colisión de cámara: acortar la distancia si hay geometría entre la cabeza y la cámara
    let maxDistance = Math.min(cameraState.distance, cameraState.maxDistance);
    ray.origin.x = p.x;
    ray.origin.y = p.y;
    ray.origin.z = p.z;
    ray.dir.x = offsetDir.x;
    ray.dir.y = offsetDir.y;
    ray.dir.z = offsetDir.z;
    const hit = world.castRay(ray, maxDistance + CAMERA_PADDING, true, filterFlags, undefined, undefined, playerState.body ?? undefined);
    if (hit) maxDistance = Math.max(0.8, hit.timeOfImpact - CAMERA_PADDING);

    // Acercarse rápido (para no atravesar), alejarse suave
    const k = maxDistance < currentDistance.current ? 25 : 4;
    currentDistance.current += (maxDistance - currentDistance.current) * (1 - Math.exp(-k * delta));

    desired.copy(p).addScaledVector(offsetDir, currentDistance.current);
    if (desired.y < 0.4) desired.y = 0.4;
    // Al entrar desde el menú, la cámara "vuela" suavemente hasta su sitio
    elapsed.current += delta;
    const follow = Math.min(14, 1.2 + elapsed.current * elapsed.current * 4);
    if (snap) {
      camera.position.copy(desired);
      cameraState.snap = false;
    } else camera.position.lerp(desired, 1 - Math.exp(-follow * delta));
    lookTarget.copy(p);
    camera.lookAt(lookTarget);
  });

  return null;
}
