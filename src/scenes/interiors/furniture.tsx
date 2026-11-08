import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GEO, getMaterial } from '../../utils/sharedResources';

type V3 = [number, number, number];

/** Muebles reutilizables por los interiores (con sus colisiones). */

export function Chair({ position, rotationY = 0, color = '#b07a4f' }: { position: V3; rotationY?: number; color?: string }) {
  const wood = getMaterial(color);
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      <CuboidCollider args={[0.24, 0.45, 0.24]} position={[0, 0.45, 0]} />
      <mesh geometry={GEO.box} material={wood} position={[0, 0.48, 0]} scale={[0.48, 0.06, 0.48]} castShadow />
      <mesh geometry={GEO.box} material={wood} position={[0, 0.82, -0.21]} scale={[0.48, 0.6, 0.06]} castShadow />
      {[-0.19, 0.19].flatMap((x) =>
        [-0.19, 0.19].map((z) => (
          <mesh key={`${x}${z}`} geometry={GEO.box} material={wood} position={[x, 0.23, z]} scale={[0.05, 0.46, 0.05]} />
        )),
      )}
    </RigidBody>
  );
}

export function RoundTable({ position, top = '#e9d8bd', leg = '#4b5563', chairs = 2 }: { position: V3; top?: string; leg?: string; chairs?: number }) {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.4, 0.6]} position={[0, 0.4, 0]} />
        <mesh geometry={GEO.cylinder12} material={getMaterial(top)} position={[0, 0.76, 0]} scale={[1.2, 0.06, 1.2]} castShadow receiveShadow />
        <mesh geometry={GEO.cylinder8} material={getMaterial(leg)} position={[0, 0.38, 0]} scale={[0.1, 0.76, 0.1]} />
        <mesh geometry={GEO.cylinder8} material={getMaterial(leg)} position={[0, 0.03, 0]} scale={[0.6, 0.06, 0.6]} />
      </RigidBody>
      {Array.from({ length: chairs }, (_, i) => {
        const a = (i / chairs) * Math.PI * 2 + Math.PI / 4;
        return <Chair key={i} position={[Math.sin(a) * 0.95, 0, Math.cos(a) * 0.95]} rotationY={a + Math.PI} />;
      })}
    </group>
  );
}

export function PottedPlant({ position, scale = 1 }: { position: V3; scale?: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} scale={scale}>
      <CylinderCollider args={[0.5, 0.35]} position={[0, 0.5, 0]} />
      <mesh geometry={GEO.cylinder8} material={getMaterial('#c96f4a')} position={[0, 0.3, 0]} scale={[0.7, 0.6, 0.7]} castShadow />
      <mesh geometry={GEO.ico} material={getMaterial('#5fae55')} position={[0, 0.95, 0]} scale={[1, 1, 1]} castShadow />
      <mesh geometry={GEO.ico} material={getMaterial('#79c76a')} position={[0.2, 1.35, 0.1]} scale={[0.7, 0.8, 0.7]} castShadow />
    </RigidBody>
  );
}

export function PendantLamp({ position, color = '#2f3640', length = 1 }: { position: V3; color?: string; length?: number }) {
  return (
    <group position={position}>
      <mesh geometry={GEO.cylinder6} material={getMaterial('#2f2a26')} position={[0, -length / 2, 0]} scale={[0.02, length, 0.02]} />
      <mesh geometry={GEO.cone8} material={getMaterial(color)} position={[0, -length - 0.15, 0]} scale={[0.6, 0.3, 0.6]} castShadow />
      <mesh
        geometry={GEO.ico}
        material={getMaterial('#ffe7a3', { emissive: '#ffe7a3', emissiveIntensity: 2 })}
        position={[0, -length - 0.32, 0]}
        scale={0.22}
      />
    </group>
  );
}

export function Rug({ position, size, color, border }: { position: V3; size: [number, number]; color: string; border: string }) {
  return (
    <group position={position}>
      <mesh geometry={GEO.box} material={getMaterial(border)} position={[0, 0.11, 0]} scale={[size[0], 0.02, size[1]]} receiveShadow />
      <mesh geometry={GEO.box} material={getMaterial(color)} position={[0, 0.125, 0]} scale={[size[0] - 0.4, 0.02, size[1] - 0.4]} receiveShadow />
    </group>
  );
}

/** Pizarra o cartel con varias líneas de texto dibujadas en un canvas. */
export function TextBoard({
  lines,
  position,
  size,
  background = '#2f3a33',
  color = '#f6efd9',
  frame = '#8a5a3b',
  rotationY = 0,
}: {
  lines: string[];
  position: V3;
  size: [number, number];
  background?: string;
  color?: string;
  frame?: string;
  rotationY?: number;
}) {
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * size[1]) / size[0]);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = canvas.height / (lines.length + 1);
    lines.forEach((line, i) => {
      const title = i === 0;
      ctx.font = `${title ? 800 : 600} ${Math.round(lineH * (title ? 0.62 : 0.48))}px "Trebuchet MS", "Segoe UI", sans-serif`;
      ctx.fillText(line, canvas.width / 2, lineH * (i + 0.85));
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  }, [lines, size, background, color]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.box} material={getMaterial(frame)} scale={[size[0] + 0.16, size[1] + 0.16, 0.06]} />
      <mesh geometry={GEO.plane} material={material} position={[0, 0, 0.035]} scale={[size[0], size[1], 1]} />
    </group>
  );
}
