import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../../../data/palette';
import type { BuildingConfig } from '../../../types/city';
import { useClockHands } from '../../../hooks/useClockHands';
import { GEO, getMaterial, getWindowMaterial } from '../../../utils/sharedResources';
import { getTextTexture } from '../../../utils/textTexture';
import { InstancedBoxes } from '../InstancedParts';
import { computeWindows, FOUNDATION_HEIGHT, roofHeight } from './buildingLayout';

type V3 = [number, number, number];

function Block({
  size,
  position,
  color,
  material,
  rotation,
  cast = true,
}: {
  size: V3;
  position: V3;
  color?: string;
  material?: THREE.Material;
  rotation?: V3;
  cast?: boolean;
}) {
  return (
    <mesh
      geometry={GEO.box}
      material={material ?? getMaterial(color ?? '#ffffff')}
      position={position}
      scale={size}
      rotation={rotation}
      castShadow={cast}
      receiveShadow
    />
  );
}

/**
 * Edificio LOW-POLY construido con primitivas a partir de su BuildingStyle.
 * Es el sustituto funcional del GLB de Blender: mismas medidas, mismo origen (centro de la base)
 * y misma orientación (fachada hacia +Z).
 */
export function ProceduralBuilding({ config }: { config: BuildingConfig }) {
  const s = config.style;
  const { width: w, depth: d, height: h } = s;
  const floorH = h / s.floors;
  const top = FOUNDATION_HEIGHT + h;
  const rh = roofHeight(s);
  const windows = useMemo(() => computeWindows(s), [s]);

  return (
    <group>
      {/* Zócalo, cuerpo y molduras */}
      <Block size={[w + 0.5, FOUNDATION_HEIGHT, d + 0.5]} position={[0, FOUNDATION_HEIGHT / 2, 0]} color={PALETTE.stoneDark} />
      <Block size={[w, h, d]} position={[0, FOUNDATION_HEIGHT + h / 2, 0]} color={s.wallColor} />
      {Array.from({ length: s.floors - 1 }, (_, i) => (
        <Block
          key={i}
          size={[w + 0.22, 0.18, d + 0.22]}
          position={[0, FOUNDATION_HEIGHT + (i + 1) * floorH, 0]}
          color={s.trimColor}
          cast={false}
        />
      ))}
      {/* Esquineros */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Block
            key={`${sx}${sz}`}
            size={[0.45, h, 0.45]}
            position={[(sx * w) / 2, FOUNDATION_HEIGHT + h / 2, (sz * d) / 2]}
            color={s.trimColor}
            cast={false}
          />
        )),
      )}

      <InstancedBoxes boxes={windows.panes} material={getWindowMaterial(s.windowColor)} />
      <InstancedBoxes boxes={windows.sills} material={getMaterial(s.trimColor)} />

      <Entrance config={config} />
      {s.awningColor && <Awning width={Math.min(w - 1, 7.5)} y={FOUNDATION_HEIGHT + floorH * 0.93} z={d / 2} color={s.awningColor} />}
      {s.signColor && (
        <Sign text={config.name} width={Math.min(w - 1.5, 6.5)} y={FOUNDATION_HEIGHT + floorH + 0.55} z={d / 2} color={s.signColor} />
      )}
      {s.columns && <Portico width={w} depth={d} height={floorH * 1.55} trim={s.trimColor} roof={s.roofColor} />}

      <Roof config={config} top={top} rh={rh} />
      {s.chimney && (
        <Block
          size={[0.8, rh * 0.6 + 1, 0.8]}
          position={[w * 0.28, top + (rh * 0.6 + 1) / 2, -d * 0.18]}
          color={PALETTE.stoneDark}
        />
      )}
      {s.clockTower && <ClockTower base={top} roofColor={s.roofColor} wall={s.wallColor} trim={s.trimColor} />}
    </group>
  );
}

function Entrance({ config }: { config: BuildingConfig }) {
  const { depth: d, doorColor, trimColor } = config.style;
  const z = d / 2;
  return (
    <group>
      <Block size={[2.1, 2.75, 0.16]} position={[0, FOUNDATION_HEIGHT + 1.37, z + 0.02]} color={trimColor} cast={false} />
      <Block size={[1.6, 2.4, 0.2]} position={[0, FOUNDATION_HEIGHT + 1.2, z + 0.06]} color={doorColor} cast={false} />
      <Block size={[0.12, 0.12, 0.1]} position={[0.55, FOUNDATION_HEIGHT + 1.15, z + 0.2]} color="#f2d16b" cast={false} />
      <Block size={[2.6, 0.22, 0.9]} position={[0, 0.11, z + 0.6]} color={PALETTE.stone} cast={false} />
    </group>
  );
}

function Awning({ width, y, z, color }: { width: number; y: number; z: number; color: string }) {
  const stripes = 7;
  const sw = width / stripes;
  return (
    <group position={[0, y, z + 0.75]} rotation={[0.38, 0, 0]}>
      {Array.from({ length: stripes }, (_, i) => (
        <Block
          key={i}
          size={[sw, 0.08, 1.6]}
          position={[-width / 2 + sw * (i + 0.5), 0, 0]}
          color={i % 2 === 0 ? color : '#fffaf0'}
        />
      ))}
    </group>
  );
}

function Sign({ text, width, y, z, color }: { text: string; width: number; y: number; z: number; color: string }) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getTextTexture(text.toUpperCase(), { background: color, color: '#fff8e8' }),
        roughness: 0.6,
      }),
    [text, color],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group position={[0, y, z]}>
      <Block size={[width + 0.25, 1.05, 0.14]} position={[0, 0, 0.07]} color="#fff8e8" cast={false} />
      <mesh geometry={GEO.plane} material={material} position={[0, 0, 0.15]} scale={[width, width / 4 > 0.9 ? 0.9 : width / 4, 1]} />
    </group>
  );
}

function Portico({ width, depth, height, trim, roof }: { width: number; depth: number; height: number; trim: string; roof: string }) {
  const pw = width * 0.8;
  const z = depth / 2 + 1.3;
  const cols = [-0.5, -0.17, 0.17, 0.5].map((t) => t * (pw - 0.8));
  return (
    <group>
      <Block size={[pw + 0.6, 0.35, 3.4]} position={[0, 0.175, depth / 2 + 1.3]} color={PALETTE.stone} />
      {cols.map((x) => (
        <mesh
          key={x}
          geometry={GEO.cylinder8}
          material={getMaterial(trim)}
          position={[x, FOUNDATION_HEIGHT + height / 2, z]}
          scale={[0.7, height, 0.7]}
          castShadow
          receiveShadow
        />
      ))}
      <Block size={[pw + 0.4, 0.45, 3]} position={[0, FOUNDATION_HEIGHT + height + 0.22, z - 0.2]} color={trim} />
      <mesh
        geometry={GEO.gable}
        material={getMaterial(roof)}
        position={[0, FOUNDATION_HEIGHT + height + 0.45, z - 0.2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[3, 1.5, pw + 0.4]}
        castShadow
      />
    </group>
  );
}

function Roof({ config, top, rh }: { config: BuildingConfig; top: number; rh: number }) {
  const s = config.style;
  const { width: w, depth: d } = s;
  const roofMat = getMaterial(s.roofColor);
  const cornice = <Block size={[w + 0.45, 0.4, d + 0.45]} position={[0, top + 0.2, 0]} color={s.trimColor} />;

  if (s.roof === 'gable') {
    const slope = Math.atan2(rh, d / 2);
    const len = Math.hypot(d / 2, rh) + 0.55;
    return (
      <group>
        <mesh geometry={GEO.gable} material={getMaterial(s.wallColor)} position={[0, top, 0]} scale={[w, rh, d]} castShadow receiveShadow />
        {[1, -1].map((side) => (
          <Block
            key={side}
            size={[w + 0.7, 0.26, len]}
            position={[0, top + rh / 2 + 0.1, (side * d) / 4 + side * 0.1]}
            rotation={[side * slope, 0, 0]}
            material={roofMat}
          />
        ))}
        <Block size={[w + 0.8, 0.22, 0.32]} position={[0, top + rh + 0.12, 0]} material={roofMat} />
      </group>
    );
  }

  if (s.roof === 'pyramid') {
    return (
      <group>
        {cornice}
        <mesh geometry={GEO.pyramid} material={roofMat} position={[0, top + 0.4, 0]} scale={[w + 0.5, rh, d + 0.5]} castShadow receiveShadow />
      </group>
    );
  }

  if (s.roof === 'dome') {
    const r = Math.min(w, d) * 0.3;
    return (
      <group>
        {cornice}
        <mesh geometry={GEO.cylinder12} material={getMaterial(s.trimColor)} position={[0, top + 0.9, 0]} scale={[r * 2.1, 1, r * 2.1]} castShadow />
        <mesh geometry={GEO.dome} material={roofMat} position={[0, top + 1.4, 0]} scale={[r * 2, r * 1.8, r * 2]} castShadow />
        <mesh geometry={GEO.cylinder8} material={getMaterial(s.trimColor)} position={[0, top + 1.4 + r * 0.9 + 0.35, 0]} scale={[0.6, 0.7, 0.6]} />
      </group>
    );
  }

  // Techo plano: azotea con equipos
  const tall = s.height > 14;
  return (
    <group>
      {cornice}
      <Block size={[w - 0.3, 0.12, d - 0.3]} position={[0, top + 0.44, 0]} material={roofMat} cast={false} />
      <Block size={[1.6, 0.9, 1.2]} position={[w * 0.22, top + 0.9, -d * 0.18]} color="#d5dbe1" />
      <Block size={[1.1, 0.7, 1.1]} position={[-w * 0.15, top + 0.8, d * 0.2]} color="#c4ccd4" />
      {tall && (
        <group position={[-w * 0.24, top + 0.4, -d * 0.2]}>
          {[-0.5, 0.5].flatMap((x) =>
            [-0.5, 0.5].map((z) => <Block key={`${x}${z}`} size={[0.12, 1.4, 0.12]} position={[x, 0.7, z]} color={PALETTE.metal} />),
          )}
          <mesh geometry={GEO.cylinder8} material={getMaterial(s.roofColor)} position={[0, 2.1, 0]} scale={[1.8, 1.5, 1.8]} castShadow />
          <mesh geometry={GEO.cone8} material={getMaterial(s.roofColor)} position={[0, 3.15, 0]} scale={[1.9, 0.6, 1.9]} />
        </group>
      )}
    </group>
  );
}

/** Torre con reloj cuyas manecillas marcan la hora real del sistema. */
function ClockTower({ base, roofColor, wall, trim }: { base: number; roofColor: string; wall: string; trim: string }) {
  const hourRef = useRef<THREE.Group>(null);
  const minuteRef = useRef<THREE.Group>(null);
  useClockHands(() => ({ hour: hourRef.current, minute: minuteRef.current }));

  const towerH = 5.5;
  const faceY = base + towerH * 0.62;
  return (
    <group>
      <Block size={[3.4, towerH, 3.4]} position={[0, base + towerH / 2, 0]} color={wall} />
      <Block size={[3.8, 0.35, 3.8]} position={[0, base + towerH, 0]} color={trim} />
      <mesh geometry={GEO.pyramid} material={getMaterial(roofColor)} position={[0, base + towerH + 0.17, 0]} scale={[3.9, 2.8, 3.9]} castShadow />
      <group position={[0, faceY, 1.72]}>
        <mesh geometry={GEO.cylinder12} material={getMaterial('#fffdf5')} rotation={[Math.PI / 2, 0, 0]} scale={[2.2, 0.12, 2.2]} />
        <mesh geometry={GEO.cylinder12} material={getMaterial(trim)} rotation={[Math.PI / 2, 0, 0]} scale={[2.45, 0.06, 2.45]} position={[0, 0, -0.04]} />
        <group ref={hourRef} position={[0, 0, 0.1]}>
          <Hand length={0.55} width={0.12} />
        </group>
        <group ref={minuteRef} position={[0, 0, 0.13]}>
          <Hand length={0.85} width={0.08} />
        </group>
      </group>
    </group>
  );
}

function Hand({ length, width }: { length: number; width: number }): ReactNode {
  return <Block size={[width, length, 0.04]} position={[0, length / 2, 0]} color="#2f2a26" cast={false} />;
}
