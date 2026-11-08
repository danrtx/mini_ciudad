import type { RapierRigidBody } from '@react-three/rapier';
import type * as THREE from 'three';

/** Referencias y estado del personaje compartidos entre sistemas (cámara, HUD, interacción). */
export const playerState = {
  /** Grupo visual (interpolado por Rapier) que sigue la cámara. */
  object: null as THREE.Object3D | null,
  body: null as RapierRigidBody | null,
  grounded: true,
  /** Velocidad horizontal actual (m/s). */
  speed: 0,
  verticalVelocity: 0,
  /** Coloca al personaje en otra posición (cambio de escena). Lo asigna el componente Player. */
  teleport: null as ((position: [number, number, number], facing: number) => void) | null,
  /** Posición actual del cuerpo físico (mundo). */
  getPosition(): [number, number, number] | null {
    const p = this.body?.translation();
    return p ? [p.x, p.y, p.z] : null;
  },
  /** Orientación visual actual (rad). Lo actualiza el componente Player. */
  facing: 0,
};

export const PLAYER = {
  capsuleHalfHeight: 0.55,
  capsuleRadius: 0.35,
  /** Distancia del centro de la cápsula a los pies. */
  footOffset: 0.9,
  walkSpeed: 4.2,
  runSpeed: 7.8,
  groundAccel: 12,
  groundDecel: 16,
  airAccel: 3,
  gravity: -24,
  jumpVelocity: 8.4,
  turnSpeed: 12,
  spawn: [0, 1.3, 23] as [number, number, number],
  /** Hacia dónde mira al aparecer (rad). π = hacia −Z (el parque). */
  spawnFacing: Math.PI,
};
