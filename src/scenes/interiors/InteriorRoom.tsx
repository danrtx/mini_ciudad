import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { InstancedBoxes, type BoxInstance } from '../../components/game/InstancedParts';
import { Interactable } from '../../components/game/interactables/Interactable';
import type { InteriorConfig } from '../../data/interiors';
import { useGameStore } from '../../stores/useGameStore';
import { GEO, getMaterial } from '../../utils/sharedResources';

export interface RoomPalette {
  floor: [string, string];
  wall: string;
  wainscot: string;
  trim: string;
  ceiling: string;
  background: string;
  lightColor: string;
}

type V3 = [number, number, number];

const WALL = 0.3;
const DOOR_W = 2.2;
const DOOR_H = 2.9;

/** Caja con colisión (estática). Útil para muebles simples. */
export function SolidBox({
  size,
  position,
  color,
  rotationY = 0,
  cast = true,
}: {
  size: V3;
  position: V3;
  color: string;
  rotationY?: number;
  cast?: boolean;
}) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={[0, rotationY, 0]}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh geometry={GEO.box} material={getMaterial(color)} scale={size} castShadow={cast} receiveShadow />
    </RigidBody>
  );
}

/** Caja solo visual (sin colisión). */
export function Box({ size, position, color, rotation }: { size: V3; position: V3; color: string; rotation?: V3 }) {
  return <mesh geometry={GEO.box} material={getMaterial(color)} position={position} scale={size} rotation={rotation} castShadow receiveShadow />;
}

/**
 * Sala genérica para interiores: piso de tablas, paredes con zócalo, techo, ventanas,
 * puerta de salida (objeto interactivo), colisiones e iluminación propia.
 * Cada interior aporta su mobiliario como `children` (en coordenadas locales).
 */
export function InteriorRoom({
  config,
  palette,
  children,
  sideWindows: withSideWindows = true,
}: {
  config: InteriorConfig;
  palette: RoomPalette;
  children: ReactNode;
  sideWindows?: boolean;
}) {
  const [w, d, h] = config.size;
  const returnToCity = useGameStore((s) => s.returnToCity);
  const lightRef = useRef<THREE.DirectionalLight>(null);

  // El "sol" que entra por las ventanas apunta al centro de esta sala (no al origen del mundo)
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    light.target.position.set(config.origin[0], 0, config.origin[2]);
    light.target.updateMatrixWorld();
  }, [config.origin]);

  const planks = useMemo(() => {
    const a: BoxInstance[] = [];
    const b: BoxInstance[] = [];
    const pw = 0.6;
    let i = 0;
    for (let x = -w / 2 + pw / 2; x < w / 2; x += pw, i++) {
      (i % 2 ? a : b).push({ position: [x, 0.05, 0], size: [pw - 0.02, 0.1, d] });
    }
    return { a, b };
  }, [w, d]);

  const sideWindows = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    if (!withSideWindows) return out;
    for (const side of [-1, 1]) {
      for (let z = -d / 2 + 2.5; z < d / 2 - 2; z += 3.4) out.push({ x: side * (w / 2 - WALL / 2 - 0.02), z, rot: side * (Math.PI / 2) });
    }
    return out;
  }, [w, d, withSideWindows]);

  const sideW = (w - DOOR_W) / 2;
  return (
    <group position={config.origin} name={`interior-${config.id}`}>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 30, 70]} />
      <hemisphereLight args={[palette.lightColor, '#6b5a4a', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        ref={lightRef}
        position={[w * 0.3, h * 2.2, d * 0.5]}
        intensity={1.4}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        shadow-camera-left={-w}
        shadow-camera-right={w}
        shadow-camera-top={d}
        shadow-camera-bottom={-d}
        shadow-camera-near={1}
        shadow-camera-far={h * 6}
      />
      <pointLight position={[-w / 4, h - 0.8, -d / 6]} intensity={14} distance={12} decay={1.6} color={palette.lightColor} />
      <pointLight position={[w / 4, h - 0.8, d / 6]} intensity={14} distance={12} decay={1.6} color={palette.lightColor} />

      {/* Piso */}
      <InstancedBoxes boxes={planks.a} material={getMaterial(palette.floor[0])} />
      <InstancedBoxes boxes={planks.b} material={getMaterial(palette.floor[1])} />

      {/* Paredes, zócalos y techo (visual) */}
      <Box size={[w, h, WALL]} position={[0, h / 2, -d / 2]} color={palette.wall} />
      <Box size={[WALL, h, d]} position={[-w / 2, h / 2, 0]} color={palette.wall} />
      <Box size={[WALL, h, d]} position={[w / 2, h / 2, 0]} color={palette.wall} />
      <Box size={[sideW, h, WALL]} position={[-(DOOR_W + sideW) / 2, h / 2, d / 2]} color={palette.wall} />
      <Box size={[sideW, h, WALL]} position={[(DOOR_W + sideW) / 2, h / 2, d / 2]} color={palette.wall} />
      <Box size={[DOOR_W, h - DOOR_H, WALL]} position={[0, DOOR_H + (h - DOOR_H) / 2, d / 2]} color={palette.wall} />
      <Box size={[w - WALL, 1.1, 0.06]} position={[0, 0.55, -d / 2 + WALL / 2 + 0.03]} color={palette.wainscot} />
      <Box size={[0.06, 1.1, d - WALL]} position={[-w / 2 + WALL / 2 + 0.03, 0.55, 0]} color={palette.wainscot} />
      <Box size={[0.06, 1.1, d - WALL]} position={[w / 2 - WALL / 2 - 0.03, 0.55, 0]} color={palette.wainscot} />
      <Box size={[w - WALL, 0.12, 0.1]} position={[0, 1.15, -d / 2 + WALL / 2 + 0.05]} color={palette.trim} />
      <Box size={[w, 0.25, d]} position={[0, h + 0.12, 0]} color={palette.ceiling} />

      {/* Ventanas laterales (paneles luminosos) */}
      {sideWindows.map((win, i) => (
        <group key={i} position={[win.x, 2.3, win.z]} rotation={[0, win.rot, 0]}>
          <mesh geometry={GEO.box} material={getMaterial(palette.trim)} scale={[1.9, 1.9, 0.12]} />
          <mesh
            geometry={GEO.box}
            material={getMaterial('#cfeeff', { emissive: '#cfeeff', emissiveIntensity: 0.9 })}
            position={[0, 0, 0.03]}
            scale={[1.6, 1.6, 0.1]}
          />
          <mesh geometry={GEO.box} material={getMaterial(palette.trim)} position={[0, 0, 0.09]} scale={[0.08, 1.6, 0.04]} />
          <mesh geometry={GEO.box} material={getMaterial(palette.trim)} position={[0, 0, 0.09]} scale={[1.6, 0.08, 0.04]} />
        </group>
      ))}

      {/* Puerta de salida: marco + exterior luminoso + objeto interactivo */}
      <Box size={[DOOR_W + 0.3, DOOR_H + 0.15, 0.12]} position={[0, (DOOR_H + 0.15) / 2, d / 2 - WALL / 2 - 0.08]} color={palette.trim} />
      <mesh
        geometry={GEO.box}
        material={getMaterial('#fff4d6', { emissive: '#fff4d6', emissiveIntensity: 1.1 })}
        position={[0, DOOR_H / 2, d / 2 + 0.05]}
        scale={[DOOR_W, DOOR_H, 0.05]}
      />
      <Interactable
        id={`${config.id}-salida`}
        name="la ciudad"
        verb="Salir a"
        position={[0, 0, d / 2 - 0.6]}
        size={[DOOR_W, DOOR_H, 0.8]}
        radius={2.4}
        color="#7cc6e8"
        onActivate={returnToCity}
      />

      {/* Colisiones de la sala (incluye techo para que la cámara no lo atraviese) */}
      <RigidBody type="fixed" colliders={false} name={`sala-${config.id}`}>
        <CuboidCollider args={[w / 2, 0.1, d / 2]} position={[0, 0, 0]} />
        <CuboidCollider args={[w / 2, 0.15, d / 2]} position={[0, h + 0.12, 0]} />
        <CuboidCollider args={[w / 2, h / 2, WALL / 2]} position={[0, h / 2, -d / 2]} />
        <CuboidCollider args={[w / 2, h / 2, WALL / 2]} position={[0, h / 2, d / 2]} />
        <CuboidCollider args={[WALL / 2, h / 2, d / 2]} position={[-w / 2, h / 2, 0]} />
        <CuboidCollider args={[WALL / 2, h / 2, d / 2]} position={[w / 2, h / 2, 0]} />
      </RigidBody>

      {children}
    </group>
  );
}
