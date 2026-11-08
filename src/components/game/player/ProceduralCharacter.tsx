import type * as THREE from 'three';
import { GEO, getMaterial } from '../../../utils/sharedResources';
import { RIG_NODE_NAMES } from './characterRig';

/**
 * Personaje LOW-POLY provisional (mismas medidas y articulaciones que el GLB de Blender).
 * Origen en los pies, mira hacia +Z, altura ≈ 1.8 m.
 * Jerarquía: cuerpo (pivote en la cadera) → torso, cabeza, brazos; las piernas cuelgan de la raíz.
 */
export const CHARACTER_COLORS = {
  skin: '#f2c6a0',
  hair: '#5b3a29',
  shirt: '#e8735a',
  pants: '#3d5a80',
  shoes: '#2f2a26',
  backpack: '#4f9d69',
  eyes: '#2d3142',
};

type V3 = [number, number, number];

function Part({ size, position, color, geometry = GEO.box }: { size: V3; position: V3; color: string; geometry?: THREE.BufferGeometry }) {
  return <mesh geometry={geometry} material={getMaterial(color)} position={position} scale={size} castShadow />;
}

export function ProceduralCharacter() {
  const c = CHARACTER_COLORS;
  return (
    <group name="personaje">
      {[1, -1].map((side) => (
        <group key={side} name={side === 1 ? RIG_NODE_NAMES.legL : RIG_NODE_NAMES.legR} position={[side * 0.15, 0.85, 0]}>
          <Part size={[0.22, 0.72, 0.24]} position={[0, -0.38, 0]} color={c.pants} />
          <Part size={[0.25, 0.13, 0.36]} position={[0, -0.79, 0.05]} color={c.shoes} />
        </group>
      ))}

      <group name={RIG_NODE_NAMES.body} position={[0, 0.85, 0]}>
        <Part size={[0.52, 0.22, 0.3]} position={[0, 0.06, 0]} color={c.pants} />
        <Part size={[0.56, 0.6, 0.32]} position={[0, 0.42, 0]} color={c.shirt} />
        <Part size={[0.4, 0.44, 0.16]} position={[0, 0.42, -0.24]} color={c.backpack} />
        <Part size={[0.08, 0.5, 0.05]} position={[0.14, 0.45, -0.15]} color={c.backpack} />
        <Part size={[0.08, 0.5, 0.05]} position={[-0.14, 0.45, -0.15]} color={c.backpack} />

        {[1, -1].map((side) => (
          <group key={side} name={side === 1 ? RIG_NODE_NAMES.armL : RIG_NODE_NAMES.armR} position={[side * 0.37, 0.66, 0]}>
            <Part size={[0.16, 0.34, 0.18]} position={[0, -0.15, 0]} color={c.shirt} />
            <Part size={[0.14, 0.26, 0.15]} position={[0, -0.43, 0]} color={c.skin} />
            <Part size={[0.17, 0.17, 0.17]} position={[0, -0.62, 0]} color={c.skin} geometry={GEO.ico} />
          </group>
        ))}

        <group name={RIG_NODE_NAMES.head} position={[0, 0.74, 0]}>
          <Part size={[0.14, 0.1, 0.14]} position={[0, 0.03, 0]} color={c.skin} />
          <Part size={[0.42, 0.42, 0.4]} position={[0, 0.28, 0]} color={c.skin} />
          <Part size={[0.46, 0.13, 0.44]} position={[0, 0.5, -0.01]} color={c.hair} />
          <Part size={[0.46, 0.3, 0.12]} position={[0, 0.36, -0.17]} color={c.hair} />
          <Part size={[0.06, 0.08, 0.02]} position={[0.1, 0.3, 0.205]} color={c.eyes} />
          <Part size={[0.06, 0.08, 0.02]} position={[-0.1, 0.3, 0.205]} color={c.eyes} />
          <Part size={[0.06, 0.06, 0.06]} position={[0, 0.22, 0.22]} color="#e9b48c" />
        </group>
      </group>
    </group>
  );
}
