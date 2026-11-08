import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CLOUDS, PARKED_CARS, STREET_SIGNS, TRAFFIC_LIGHTS, type StreetSignConfig } from '../../data/cityLayout';
import { PALETTE } from '../../data/palette';
import type { Vec3 } from '../../types/city';
import { GEO, getMaterial } from '../../utils/sharedResources';
import { getTextTexture } from '../../utils/textTexture';

const metal = () => getMaterial(PALETTE.metal, { roughness: 0.5, metalness: 0.4 });

function SignPlate({ text, rotationY, y }: { text: string; rotationY: number; y: number }) {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: getTextTexture(text, { background: '#2f7d5b', color: '#ffffff' }), roughness: 0.5 }),
    [text],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group rotation={[0, rotationY, 0]} position={[0, y, 0]}>
      <mesh geometry={GEO.box} material={material} position={[1.05, 0, 0]} scale={[2.2, 0.55, 0.06]} castShadow />
    </group>
  );
}

function StreetSign({ position, rotationY, labels }: StreetSignConfig) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.cylinder8} material={metal()} position={[0, 1.6, 0]} scale={[0.12, 3.2, 0.12]} castShadow />
      <SignPlate text={labels[0]} rotationY={0} y={3.0} />
      <SignPlate text={labels[1]} rotationY={Math.PI / 2} y={2.4} />
    </group>
  );
}

/** Semáforo con ciclo verde → ámbar → rojo (solo emisivos, sin luces dinámicas). */
function TrafficLight({ position, rotationY, offset }: { position: Vec3; rotationY: number; offset: number }) {
  const lights = useMemo(
    () =>
      ['#ff5b5b', '#ffc547', '#53d88a'].map(
        (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.1, flatShading: true }),
      ),
    [],
  );
  useEffect(() => () => lights.forEach((m) => m.dispose()), [lights]);
  const last = useRef(-1);

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime + offset) % 12;
    const state = t < 5 ? 2 : t < 7 ? 1 : 0;
    if (state === last.current) return;
    last.current = state;
    lights.forEach((m, i) => (m.emissiveIntensity = i === state ? 1.6 : 0.05));
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.cylinder8} material={metal()} position={[0, 1.7, 0]} scale={[0.14, 3.4, 0.14]} castShadow />
      <mesh geometry={GEO.box} material={getMaterial('#2f3640')} position={[0, 3.75, 0]} scale={[0.5, 1.4, 0.4]} castShadow />
      {lights.map((m, i) => (
        <mesh key={i} geometry={GEO.cylinder8} material={m} position={[0, 4.2 - i * 0.43, 0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[0.3, 0.06, 0.3]} />
      ))}
    </group>
  );
}

function Car({ position, rotationY, color }: { position: Vec3; rotationY: number; color: string }) {
  const body = getMaterial(color, { roughness: 0.45 });
  const glass = getMaterial('#bfe6f5', { roughness: 0.2, metalness: 0.2 });
  const tire = getMaterial('#2b2b2b');
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={GEO.box} material={body} position={[0, 0.75, 0]} scale={[3.6, 0.8, 1.7]} castShadow receiveShadow />
      <mesh geometry={GEO.box} material={body} position={[-0.25, 1.45, 0]} scale={[2, 0.65, 1.55]} castShadow />
      <mesh geometry={GEO.box} material={glass} position={[-0.25, 1.45, 0]} scale={[1.85, 0.5, 1.6]} />
      <mesh geometry={GEO.box} material={getMaterial('#fff6c9', { emissive: '#fff6c9', emissiveIntensity: 0.5 })} position={[1.81, 0.82, 0]} scale={[0.05, 0.2, 1.3]} />
      {[-1.15, 1.15].flatMap((x) =>
        [-0.82, 0.82].map((z) => (
          <mesh key={`${x}${z}`} geometry={GEO.cylinder8} material={tire} position={[x, 0.38, z]} rotation={[Math.PI / 2, 0, 0]} scale={[0.75, 0.3, 0.75]} castShadow />
        )),
      )}
    </group>
  );
}

/** Nubes low-poly que se desplazan lentamente (se mueve un único grupo: sin reservar memoria). */
function Clouds() {
  const ref = useRef<THREE.Group>(null);
  const material = getMaterial(PALETTE.cloud, { emissive: '#ffffff', emissiveIntensity: 0.25 });
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    for (const child of g.children) {
      child.position.x += delta * 1.2;
      if (child.position.x > 110) child.position.x = -110;
    }
  });
  return (
    <group ref={ref} name="nubes">
      {CLOUDS.map((c, i) => (
        <group key={i} position={c.position} scale={c.scale}>
          <mesh geometry={GEO.ico} material={material} scale={[3, 1.6, 2]} />
          <mesh geometry={GEO.ico} material={material} position={[1.2, 0.3, 0.2]} scale={[2, 1.5, 1.6]} />
          <mesh geometry={GEO.ico} material={material} position={[-1.1, 0.1, -0.2]} scale={[1.8, 1.2, 1.5]} />
        </group>
      ))}
    </group>
  );
}

export function StreetFurniture() {
  return (
    <group name="senalizacion">
      {STREET_SIGNS.map((s, i) => (
        <StreetSign key={i} {...s} />
      ))}
      {TRAFFIC_LIGHTS.map((t, i) => (
        <TrafficLight key={i} position={t.position} rotationY={t.rotationY} offset={i * 4} />
      ))}
      {PARKED_CARS.map((c, i) => (
        <Car key={i} {...c} />
      ))}
      <Clouds />
    </group>
  );
}
