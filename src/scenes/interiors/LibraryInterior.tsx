import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { InstancedBoxes, type BoxInstance } from '../../components/game/InstancedParts';
import { Interactable } from '../../components/game/interactables/Interactable';
import { LIBRARY_CONTENT as L, type ObjectContent } from '../../data/interiorContent';
import { INTERIORS } from '../../data/interiors';
import { createRandom, pick } from '../../utils/random';
import { GEO, getMaterial } from '../../utils/sharedResources';
import { Chair, PendantLamp, PottedPlant, Rug, TextBoard } from './furniture';
import { Box, InteriorRoom, SolidBox, type RoomPalette } from './InteriorRoom';

const PALETTE: RoomPalette = {
  floor: ['#8a5a3b', '#7a4e33'],
  wall: '#e4ebf3',
  wainscot: '#3d5a80',
  trim: '#fffaf0',
  ceiling: '#dfe6ee',
  background: '#1f2430',
  lightColor: '#fff1d6',
};

const BOOK_COLORS = ['#c4553f', '#3d5a80', '#4f9d69', '#f2b45a', '#8a6fc4', '#e8735a', '#2f7d5b', '#d6c6ef', '#7a4a32', '#f6efd9'];
const SHELF = { width: 3, height: 4.2, depth: 0.6, levels: 5 };

interface ShelfUnit {
  x: number;
  z: number;
  rot: number;
}

const UNITS: ShelfUnit[] = [
  ...[-5, -1.8, 1.4].map((z) => ({ x: -8.55, z, rot: Math.PI / 2 })),
  ...[-5, -1.8, 1.4].map((z) => ({ x: 8.55, z, rot: -Math.PI / 2 })),
  ...[-6.6, -3.4, 3.4, 6.6].map((x) => ({ x, z: -7.05, rot: 0 })),
];

/** Todos los libros de todas las estanterías en UN InstancedMesh con color por instancia. */
function useBooks(): BoxInstance[] {
  return useMemo(() => {
    const rand = createRandom(2024);
    const books: BoxInstance[] = [];
    for (const u of UNITS) {
      const cos = Math.cos(u.rot);
      const sin = Math.sin(u.rot);
      for (let level = 0; level < SHELF.levels; level++) {
        const boardY = 0.18 + level * 0.8;
        let lx = -SHELF.width / 2 + 0.2;
        while (lx < SHELF.width / 2 - 0.3) {
          const bw = 0.1 + rand() * 0.1;
          const bh = 0.36 + rand() * 0.16;
          if (rand() < 0.08) {
            lx += bw + 0.15; // hueco
            continue;
          }
          const cx = lx + bw / 2;
          const lz = 0.04;
          books.push({
            position: [u.x + cx * cos + lz * sin, boardY + 0.04 + bh / 2, u.z - cx * sin + lz * cos],
            size: [bw, bh, 0.38],
            rotationY: u.rot + (rand() - 0.5) * 0.06,
            color: pick(rand, BOOK_COLORS),
          });
          lx += bw + 0.01;
        }
      }
    }
    return books;
  }, []);
}

function Bookshelf({ unit }: { unit: ShelfUnit }) {
  const wood = '#5b3a29';
  const { width: w, height: h, depth: d, levels } = SHELF;
  return (
    <RigidBody type="fixed" colliders={false} position={[unit.x, 0, unit.z]} rotation={[0, unit.rot, 0]}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      <Box size={[w, h, 0.05]} position={[0, h / 2, -d / 2 + 0.025]} color="#4a2f22" />
      <Box size={[0.08, h, d]} position={[-w / 2, h / 2, 0]} color={wood} />
      <Box size={[0.08, h, d]} position={[w / 2, h / 2, 0]} color={wood} />
      <Box size={[w + 0.12, 0.12, d + 0.06]} position={[0, h, 0]} color={wood} />
      {Array.from({ length: levels }, (_, i) => (
        <Box key={i} size={[w, 0.06, d]} position={[0, 0.18 + i * 0.8, 0]} color={wood} />
      ))}
    </RigidBody>
  );
}

/** Libro destacado: al activarlo se levanta y gira un poco antes de volver a su lugar. */
function FeaturedBook({ id, content, position, color, rotationY }: { id: string; content: ObjectContent; position: [number, number, number]; color: string; rotationY: number }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(-1);
  const lift = useCallback(() => {
    t.current = 0;
  }, []);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    if (t.current >= 0) {
      t.current += delta;
      const k = Math.sin(Math.min(1, t.current / 1.6) * Math.PI);
      g.position.y = k * 0.35;
      g.rotation.y = k * 0.6;
      if (t.current > 1.6) t.current = -1;
    }
  });
  return (
    <Interactable
      id={id}
      name={content.name}
      verb={content.verb}
      description={content.description}
      details={content.details}
      position={position}
      rotationY={rotationY}
      size={[0.5, 0.7, 0.4]}
      radius={1.9}
      onActivate={lift}
    >
      <group ref={ref}>
        <mesh geometry={GEO.box} material={getMaterial(color)} position={[0, 0.3, 0]} scale={[0.42, 0.58, 0.09]} castShadow />
        <mesh geometry={GEO.box} material={getMaterial('#fffaf0')} position={[0.015, 0.3, 0]} scale={[0.38, 0.54, 0.1]} />
        <mesh geometry={GEO.box} material={getMaterial('#f2d16b')} position={[0, 0.42, 0.05]} scale={[0.28, 0.06, 0.01]} />
      </group>
    </Interactable>
  );
}

function Globe({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const speed = useRef(0.15);
  const spin = useCallback(() => {
    speed.current += 6;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += speed.current * delta;
    speed.current = 0.15 + (speed.current - 0.15) * Math.exp(-0.8 * delta);
  });
  return (
    <Interactable id="globo" name={L.globo.name} verb={L.globo.verb} position={position} size={[1.1, 1.7, 1.1]} radius={2} onActivate={spin}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.8, 0.45]} position={[0, 0.8, 0]} />
      </RigidBody>
      <mesh geometry={GEO.cylinder8} material={getMaterial('#5b3a29')} position={[0, 0.05, 0]} scale={[0.8, 0.1, 0.8]} />
      <mesh geometry={GEO.cylinder6} material={getMaterial('#5b3a29')} position={[0, 0.5, 0]} scale={[0.08, 0.9, 0.08]} />
      <group position={[0, 1.2, 0]} rotation={[0, 0, 0.4]}>
        <group ref={ref}>
          <mesh geometry={GEO.ico1} material={getMaterial('#5aa9d6', { roughness: 0.5 })} scale={0.9} castShadow />
          {[
            [0.2, 0.15, 0.36],
            [-0.3, -0.05, 0.3],
            [0.1, -0.3, -0.33],
            [-0.25, 0.25, -0.28],
          ].map((p, i) => (
            <mesh key={i} geometry={GEO.ico} material={getMaterial('#6cc25a')} position={p as [number, number, number]} scale={[0.32, 0.22, 0.2]} />
          ))}
        </group>
        <mesh geometry={GEO.box} material={getMaterial('#b08d57', { metalness: 0.5, roughness: 0.4 })} scale={[0.04, 1.05, 0.04]} />
      </group>
    </Interactable>
  );
}

function ReadingTable({ position, lampId }: { position: [number, number, number]; lampId?: string }) {
  const [on, setOn] = useState(true);
  const toggle = useCallback(() => setOn((v) => !v), []);
  const lamp = (
    <group>
      <mesh geometry={GEO.cylinder8} material={getMaterial('#b08d57', { metalness: 0.5 })} position={[0, 0.03, 0]} scale={[0.28, 0.05, 0.28]} />
      <mesh geometry={GEO.cylinder6} material={getMaterial('#b08d57', { metalness: 0.5 })} position={[0, 0.22, 0]} scale={[0.04, 0.4, 0.04]} />
      <mesh geometry={GEO.box} material={getMaterial('#2f7d5b', { emissive: '#2f7d5b', emissiveIntensity: on ? 0.4 : 0 })} position={[0, 0.45, 0.05]} scale={[0.5, 0.14, 0.24]} />
      <mesh
        geometry={GEO.box}
        material={getMaterial('#fff1c2', { emissive: '#fff1c2', emissiveIntensity: on ? 1.8 : 0 })}
        position={[0, 0.37, 0.05]}
        scale={[0.42, 0.02, 0.18]}
      />
      {on && <pointLight position={[0, 0.25, 0.1]} intensity={4} distance={4} decay={1.8} color="#fff1c2" />}
    </group>
  );
  return (
    <group position={position}>
      <SolidBox size={[3.2, 0.08, 1.2]} position={[0, 0.8, 0]} color="#7a4a32" />
      <SolidBox size={[3, 0.7, 0.1]} position={[0, 0.42, 0]} color="#5b3a29" cast={false} />
      {[-1, 1].flatMap((side) =>
        [-0.9, 0.9].map((x) => <Chair key={`${side}${x}`} position={[x, 0, side * 1]} rotationY={side === 1 ? Math.PI : 0} color="#5b3a29" />),
      )}
      {lampId ? (
        <Interactable id={lampId} name={L.lampara.name} verb={L.lampara.verb} position={[0, 0.84, -0.3]} size={[0.6, 0.6, 0.5]} radius={2} onActivate={toggle}>
          {lamp}
        </Interactable>
      ) : (
        <group position={[0, 0.84, -0.3]}>{lamp}</group>
      )}
      <Box size={[0.5, 0.06, 0.35]} position={[0.9, 0.87, 0.2]} color="#f6efd9" rotation={[0, 0.3, 0]} />
    </group>
  );
}

/** Interior de la biblioteca (carga diferida). */
export default function LibraryInterior() {
  const cfg = INTERIORS.biblioteca;
  const books = useBooks();
  const [, d, h] = cfg.size;

  return (
    <InteriorRoom config={cfg} palette={PALETTE} sideWindows={false}>
      {UNITS.map((u, i) => (
        <Bookshelf key={i} unit={u} />
      ))}
      <InstancedBoxes boxes={books} material={getMaterial('#ffffff')} castShadow />

      {/* Ventanal del fondo */}
      <group position={[0, 0, -d / 2 + 0.2]}>
        <Box size={[3.2, 4.4, 0.12]} position={[0, 2.7, 0]} color={PALETTE.trim} />
        <mesh geometry={GEO.box} material={getMaterial('#cfeeff', { emissive: '#cfeeff', emissiveIntensity: 1 })} position={[0, 2.7, 0.04]} scale={[2.8, 4, 0.1]} />
        <Box size={[0.1, 4, 0.06]} position={[0, 2.7, 0.1]} color={PALETTE.trim} />
        <Box size={[2.8, 0.1, 0.06]} position={[0, 3.3, 0.1]} color={PALETTE.trim} />
      </group>

      {/* Mesa de recomendados con libros interactivos */}
      <SolidBox size={[2.8, 0.9, 1.1]} position={[0, 0.55, 0.6]} color="#5b3a29" />
      <Box size={[3, 0.08, 1.3]} position={[0, 1.04, 0.6]} color="#7a4a32" />
      <FeaturedBook id="libro-quijote" content={L.quijote} position={[-0.85, 1.08, 0.75]} color="#c4553f" rotationY={0.2} />
      <FeaturedBook id="libro-maria" content={L.maria} position={[0, 1.08, 0.8]} color="#4f9d69" rotationY={0} />
      <FeaturedBook id="libro-odisea" content={L.odisea} position={[0.85, 1.08, 0.75]} color="#3d5a80" rotationY={-0.2} />
      <TextBoard lines={['RECOMENDADOS', 'del mes']} position={[0, 1.6, 0.05]} size={[1.6, 0.5]} background="#3d5a80" frame="#fffaf0" />

      <ReadingTable position={[-4.2, 0, -3]} lampId="lampara-lectura" />
      <ReadingTable position={[4.2, 0, -3]} />

      {/* Mostrador de préstamos */}
      <Interactable
        id="prestamos"
        name={L.prestamos.name}
        verb={L.prestamos.verb}
        description={L.prestamos.description}
        details={L.prestamos.details}
        position={[-5.6, 0, 4.4]}
        size={[2.8, 1.4, 1.3]}
        radius={2.6}
      >
        <SolidBox size={[2.6, 1.05, 1]} position={[0, 0.6, 0]} color="#3d5a80" />
        <Box size={[2.8, 0.08, 1.15]} position={[0, 1.16, 0]} color="#7a4a32" />
        <mesh geometry={GEO.dome} material={getMaterial('#f2d16b', { metalness: 0.6, roughness: 0.3 })} position={[0.8, 1.2, 0.1]} scale={0.3} />
        <TextBoard lines={['PRÉSTAMOS']} position={[0, 0.65, 0.52]} size={[1.4, 0.36]} background="#fffaf0" color="#3d5a80" frame="#7a4a32" />
      </Interactable>

      <Globe position={[5.8, 0, 4]} />

      <PottedPlant position={[-7.9, 0, 6.4]} scale={1.2} />
      <PottedPlant position={[7.9, 0, 6.4]} scale={1.2} />
      <Rug position={[0, 0, 1.6]} size={[6, 5]} color="#3d5a80" border="#f2d16b" />
      <PendantLamp position={[0, h, 0.8]} color="#f2d16b" length={2} />
      <PendantLamp position={[-4.2, h, -3]} color="#2f7d5b" length={2.2} />
      <PendantLamp position={[4.2, h, -3]} color="#2f7d5b" length={2.2} />
    </InteriorRoom>
  );
}
