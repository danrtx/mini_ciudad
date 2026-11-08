import { useMemo } from 'react';
import { CROSSWALKS, GROUND_SIZE, ROAD_Y, SIDEWALK_HEIGHT, SIDEWALKS, STREETS } from '../../data/cityLayout';
import { PALETTE } from '../../data/palette';
import type { RectXZ, StreetConfig } from '../../types/city';
import { rectCenter, rectSize } from '../../utils/geometry2d';
import { GEO, getMaterial } from '../../utils/sharedResources';
import { InstancedBoxes, type BoxInstance } from '../../components/game/InstancedParts';

function Slab({ rect, y, height, color }: { rect: RectXZ; y: number; height: number; color: string }) {
  const [cx, cz] = rectCenter(rect);
  const [sx, sz] = rectSize(rect);
  return (
    <mesh geometry={GEO.box} material={getMaterial(color)} position={[cx, y + height / 2, cz]} scale={[sx, height, sz]} receiveShadow />
  );
}

/** Líneas discontinuas en el centro de cada calle, omitiendo intersecciones. */
function laneDashes(street: StreetConfig): BoxInstance[] {
  const [x0, z0, x1, z1] = street.rect;
  const out: BoxInstance[] = [];
  const along = street.axis === 'x';
  const [start, end] = along ? [x0, x1] : [z0, z1];
  const center = along ? (z0 + z1) / 2 : (x0 + x1) / 2;
  for (let v = start + 2; v < end - 1; v += 4) {
    if (street.gaps?.some(([a, b]) => v > a - 1.5 && v < b + 1.5)) continue;
    out.push({
      position: along ? [v, ROAD_Y + 0.012, center] : [center, ROAD_Y + 0.012, v],
      size: along ? [2, 0.02, 0.22] : [0.22, 0.02, 2],
    });
  }
  return out;
}

function crosswalkStripes(): BoxInstance[] {
  const out: BoxInstance[] = [];
  for (const { rect, stripesAlong } of CROSSWALKS) {
    const [x0, z0, x1, z1] = rect;
    if (stripesAlong === 'x') {
      for (let x = x0 + 0.7; x < x1 - 0.3; x += 1.2) {
        out.push({ position: [x, ROAD_Y + 0.012, (z0 + z1) / 2], size: [0.6, 0.02, z1 - z0] });
      }
    } else {
      for (let z = z0 + 0.7; z < z1 - 0.3; z += 1.2) {
        out.push({ position: [(x0 + x1) / 2, ROAD_Y + 0.012, z], size: [x1 - x0, 0.02, 0.6] });
      }
    }
  }
  return out;
}

/** Suelo, calzadas, aceras, líneas viales y pasos de cebra. */
export function Streets() {
  const dashes = useMemo(() => STREETS.flatMap(laneDashes), []);
  const stripes = useMemo(() => crosswalkStripes(), []);
  return (
    <group name="calles">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={GEO.plane} material={getMaterial(PALETTE.grass)} scale={[GROUND_SIZE * 4, GROUND_SIZE * 4, 1]} />
      {STREETS.map((s) => (
        <Slab key={s.id} rect={s.rect} y={-0.02} height={ROAD_Y + 0.02} color={PALETTE.road} />
      ))}
      {SIDEWALKS.map((r, i) => (
        <Slab key={i} rect={r} y={0} height={SIDEWALK_HEIGHT} color={PALETTE.sidewalk} />
      ))}
      <InstancedBoxes boxes={dashes} material={getMaterial(PALETTE.roadLine)} />
      <InstancedBoxes boxes={stripes} material={getMaterial(PALETTE.crosswalk)} />
    </group>
  );
}
