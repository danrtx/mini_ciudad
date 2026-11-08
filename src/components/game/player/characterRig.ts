import type * as THREE from 'three';

/**
 * Articulaciones del personaje. Los nombres coinciden con los objetos que exporta
 * blender/generar_modelos.py, así el mismo sistema anima el modelo procedural y el GLB.
 */
export const RIG_NODE_NAMES = {
  body: 'cuerpo',
  head: 'cabeza',
  armL: 'brazo_izq',
  armR: 'brazo_der',
  legL: 'pierna_izq',
  legR: 'pierna_der',
} as const;

export type CharacterRig = { [K in keyof typeof RIG_NODE_NAMES]: THREE.Object3D | null };

export function findRig(root: THREE.Object3D): CharacterRig {
  return {
    body: root.getObjectByName(RIG_NODE_NAMES.body) ?? null,
    head: root.getObjectByName(RIG_NODE_NAMES.head) ?? null,
    armL: root.getObjectByName(RIG_NODE_NAMES.armL) ?? null,
    armR: root.getObjectByName(RIG_NODE_NAMES.armR) ?? null,
    legL: root.getObjectByName(RIG_NODE_NAMES.legL) ?? null,
    legR: root.getObjectByName(RIG_NODE_NAMES.legR) ?? null,
  };
}

export interface AnimationInput {
  /** Velocidad horizontal normalizada: 0 quieto, 1 caminar, ~1.85 correr. */
  speed: number;
  grounded: boolean;
  verticalVelocity: number;
}

/** Posición base del cuerpo (se guarda para poder hacer el balanceo vertical). */
const baseY = new WeakMap<THREE.Object3D, number>();

/**
 * Animación procedural: caminar, correr, saltar/caer y respiración en reposo.
 * `phase` es un acumulador que el llamador conserva entre fotogramas.
 */
export function animateRig(rig: CharacterRig, input: AnimationInput, state: { phase: number }, delta: number) {
  const { speed, grounded, verticalVelocity } = input;
  const running = speed > 1.3;
  const k = 1 - Math.exp(-14 * delta); // suavizado de transición entre poses

  let legSwing = 0;
  let armSwing = 0;
  let bob = 0;
  let armSpread = 0;
  let legBend = 0;
  let lean = 0;

  if (!grounded) {
    // En el aire: piernas recogidas y brazos arriba al subir, extendidos al caer
    const rising = verticalVelocity > 0;
    legBend = rising ? 0.7 : 0.3;
    armSpread = rising ? 0.5 : 0.9;
    armSwing = rising ? -2.4 : -1.2;
  } else if (speed > 0.05) {
    state.phase += delta * (running ? 11 : 7.5) * Math.min(speed, 1.2);
    const amp = running ? 0.95 : 0.6;
    legSwing = Math.sin(state.phase) * amp;
    armSwing = -Math.sin(state.phase) * amp * 0.85;
    bob = Math.abs(Math.cos(state.phase)) * (running ? 0.09 : 0.05);
    lean = running ? 0.18 : 0.06;
  } else {
    state.phase += delta * 2;
    bob = Math.sin(state.phase) * 0.012;
    armSpread = 0.05;
  }

  const lerp = (o: THREE.Object3D | null, axis: 'x' | 'z', target: number) => {
    if (o) o.rotation[axis] += (target - o.rotation[axis]) * k;
  };
  lerp(rig.legL, 'x', grounded ? legSwing : -legBend);
  lerp(rig.legR, 'x', grounded ? -legSwing : legBend * 0.4);
  lerp(rig.armL, 'x', grounded ? armSwing : armSwing);
  lerp(rig.armR, 'x', grounded ? -armSwing : armSwing);
  lerp(rig.armL, 'z', armSpread);
  lerp(rig.armR, 'z', -armSpread);
  lerp(rig.body, 'x', lean);
  if (rig.body) {
    if (!baseY.has(rig.body)) baseY.set(rig.body, rig.body.position.y);
    rig.body.position.y = (baseY.get(rig.body) ?? 0) + bob;
  }
  lerp(rig.head, 'x', -lean * 0.6);
}
