import { useMemo } from 'react';
import { HEDGES, PARK, PARK_Y } from '../../data/cityLayout';
import { PALETTE } from '../../data/palette';
import type { PropTransform, Vec3 } from '../../types/city';
import { rectCenter, rectSize } from '../../utils/geometry2d';
import { createRandom } from '../../utils/random';
import { GEO, getMaterial } from '../../utils/sharedResources';
import { InstancedBoxes, InstancedParts, type BoxInstance, type InstancedPart } from '../../components/game/InstancedParts';
import { Fountain } from './Fountain';

function Gazebo({ position }: { position: Vec3 }) {
  const wood = getMaterial('#fff4e2');
  const roof = getMaterial('#d9704f');
  const posts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return [Math.cos(a) * 2.3, Math.sin(a) * 2.3] as const;
  });
  return (
    <group position={position} name="kiosco">
      <mesh geometry={GEO.cylinder6} material={getMaterial(PALETTE.stone)} position={[0, 0.2, 0]} scale={[6, 0.4, 6]} receiveShadow castShadow />
      {posts.map(([x, z], i) => (
        <mesh key={i} geometry={GEO.cylinder6} material={wood} position={[x, 1.75, z]} scale={[0.25, 2.7, 0.25]} castShadow />
      ))}
      <mesh geometry={GEO.cylinder6} material={wood} position={[0, 3.2, 0]} scale={[5.6, 0.25, 5.6]} castShadow />
      <mesh geometry={GEO.cone6} material={roof} position={[0, 4.15, 0]} scale={[6.4, 1.7, 6.4]} castShadow />
      <mesh geometry={GEO.ico} material={getMaterial('#f2d16b')} position={[0, 5.1, 0]} scale={[0.4, 0.4, 0.4]} />
    </group>
  );
}

const flowerPart: InstancedPart[] = [
  { geometry: GEO.ico, material: getMaterial('#ffffff'), tints: PALETTE.flowers, castShadow: false },
];

function FlowerBeds() {
  const flowers = useMemo<PropTransform[]>(() => {
    const rand = createRandom(99);
    return PARK.flowerBeds.flatMap((c) =>
      Array.from({ length: 26 }, () => {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 1.8;
        return { position: [c[0] + Math.cos(a) * r, c[1] + 0.42, c[2] + Math.sin(a) * r] as Vec3, scale: 0.35 + rand() * 0.2 };
      }),
    );
  }, []);
  return (
    <group>
      {PARK.flowerBeds.map((c, i) => (
        <group key={i} position={c}>
          <mesh geometry={GEO.cylinder12} material={getMaterial(PALETTE.stone)} position={[0, 0.17, 0]} scale={[4.6, 0.34, 4.6]} castShadow receiveShadow />
          <mesh geometry={GEO.cylinder12} material={getMaterial('#8a6142')} position={[0, 0.3, 0]} scale={[4.1, 0.2, 4.1]} receiveShadow />
        </group>
      ))}
      <InstancedParts parts={flowerPart} transforms={flowers} seed={5} />
    </group>
  );
}

/** Parque central: césped elevado, senderos, plaza con fuente, kiosco, setos y jardineras. */
export function Park() {
  const [cx, cz] = rectCenter(PARK.rect);
  const [sx, sz] = rectSize(PARK.rect);
  const hedges = useMemo<BoxInstance[]>(
    () =>
      HEDGES.map((r) => {
        const [hx, hz] = rectCenter(r);
        const [hsx, hsz] = rectSize(r);
        return { position: [hx, PARK_Y + 0.45, hz], size: [hsx, 0.9, hsz] };
      }),
    [],
  );
  const pathTiles = useMemo<BoxInstance[]>(
    () =>
      PARK.paths.map((r) => {
        const [px, pz] = rectCenter(r);
        const [psx, psz] = rectSize(r);
        return { position: [px, PARK_Y + 0.015, pz], size: [psx, 0.03, psz] };
      }),
    [],
  );
  const [fx, , fz] = PARK.fountainCenter;

  return (
    <group name="parque-central">
      <mesh geometry={GEO.box} material={getMaterial(PALETTE.grassPark)} position={[cx, PARK_Y / 2, cz]} scale={[sx, PARK_Y, sz]} receiveShadow />
      <InstancedBoxes boxes={pathTiles} material={getMaterial(PALETTE.path)} />
      <mesh geometry={GEO.cylinder12} material={getMaterial(PALETTE.plaza)} position={[fx, PARK_Y + 0.02, fz]} scale={[PARK.plazaRadius * 2, 0.04, PARK.plazaRadius * 2]} receiveShadow />
      <InstancedBoxes boxes={hedges} material={getMaterial(PALETTE.hedge)} castShadow />
      <Fountain position={PARK.fountainCenter} />
      <Gazebo position={PARK.gazebo} />
      <FlowerBeds />
    </group>
  );
}
