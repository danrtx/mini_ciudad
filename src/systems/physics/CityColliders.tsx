import { BallCollider, CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import { FOUNDATION_HEIGHT, roofHeight } from '../../components/game/buildings/buildingLayout';
import { BUILDINGS } from '../../data/buildings';
import {
  GROUND_SIZE,
  HEDGES,
  PARK,
  PARK_Y,
  PARKED_CARS,
  PROPS,
  SIDEWALK_HEIGHT,
  SIDEWALKS,
  STREET_SIGNS,
  TRAFFIC_LIGHTS,
} from '../../data/cityLayout';
import type { BuildingConfig, RectXZ } from '../../types/city';
import { rectCenter, rectSize } from '../../utils/geometry2d';


/** Losa rectangular (acera, parque, seto…) como cuboide. */
function SlabCollider({ rect, y0, height }: { rect: RectXZ; y0: number; height: number }) {
  const [cx, cz] = rectCenter(rect);
  const [sx, sz] = rectSize(rect);
  return <CuboidCollider args={[sx / 2, height / 2, sz / 2]} position={[cx, y0 + height / 2, cz]} />;
}

/** Colisiones de un edificio en su espacio local (el RigidBody aplica posición y rotación). */
function BuildingColliders({ b }: { b: BuildingConfig }) {
  const s = b.style;
  const total = FOUNDATION_HEIGHT + s.height + roofHeight(s);
  const floorH = s.height / s.floors;
  return (
    <RigidBody type="fixed" colliders={false} position={b.position} rotation={[0, b.rotationY, 0]}>
      <CuboidCollider args={[s.width / 2 + 0.25, total / 2, s.depth / 2 + 0.25]} position={[0, total / 2, 0]} />
      {/* Escalón de la entrada (se sube con autostep) */}
      <CuboidCollider args={[1.3, 0.11, 0.45]} position={[0, 0.11, s.depth / 2 + 0.6]} />
      {s.columns && (
        <>
          <CuboidCollider args={[s.width * 0.4 + 0.3, 0.175, 1.7]} position={[0, 0.175, s.depth / 2 + 1.3]} />
          {[-0.5, -0.17, 0.17, 0.5].map((t) => (
            <CylinderCollider
              key={t}
              args={[(floorH * 1.55) / 2, 0.35]}
              position={[t * (s.width * 0.8 - 0.8), FOUNDATION_HEIGHT + (floorH * 1.55) / 2, s.depth / 2 + 1.3]}
            />
          ))}
        </>
      )}
    </RigidBody>
  );
}

/**
 * Mundo físico estático de la ciudad: suelo, aceras, parque, edificios, mobiliario y límites.
 * Se usan primitivas (cuboides y cilindros) en vez de mallas trimesh: es mucho más barato.
 */
export function CityColliders() {
  const trunks = useMemo(
    () => [
      ...PROPS.tree.map((t) => ({ ...t, r: 0.3, h: 2.2 })),
      ...PROPS.pine.map((t) => ({ ...t, r: 0.35, h: 2.2 })),
      ...PROPS.lamp.map((t) => ({ ...t, r: 0.18, h: 4.2 })),
      ...STREET_SIGNS.map((t) => ({ ...t, scale: 1, r: 0.14, h: 3.2 })),
      ...TRAFFIC_LIGHTS.map((t) => ({ ...t, scale: 1, r: 0.16, h: 4.4 })),
    ],
    [],
  );
  const half = GROUND_SIZE / 2;
  const [fx, fy, fz] = PARK.fountainCenter;
  const [gx, gy, gz] = PARK.gazebo;

  return (
    <>
      <RigidBody type="fixed" colliders={false} name="ciudad-estatica">
        {/* Suelo */}
        <CuboidCollider args={[half * 4, 0.5, half * 4]} position={[0, -0.5, 0]} />
        {/* Aceras y parque (0.2 m: el personaje los sube solo) */}
        {SIDEWALKS.map((r, i) => (
          <SlabCollider key={`acera-${i}`} rect={r} y0={0} height={SIDEWALK_HEIGHT} />
        ))}
        <SlabCollider rect={PARK.rect} y0={0} height={PARK_Y} />
        {HEDGES.map((r, i) => (
          <SlabCollider key={`seto-${i}`} rect={r} y0={PARK_Y} height={0.9} />
        ))}

        {/* Fuente: el borde (0.6 m) no se puede subir caminando, pero sí saltando */}
        <CylinderCollider args={[0.3, 3.5]} position={[fx, fy + 0.3, fz]} />
        <CylinderCollider args={[1.6, 0.5]} position={[fx, fy + 1.6, fz]} />

        {/* Kiosco: plataforma + postes */}
        <CylinderCollider args={[0.2, 3]} position={[gx, gy + 0.2, gz]} />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <CylinderCollider key={`poste-${i}`} args={[1.35, 0.15]} position={[gx + Math.cos(a) * 2.3, gy + 1.75, gz + Math.sin(a) * 2.3]} />;
        })}

        {PARK.flowerBeds.map((c, i) => (
          <CylinderCollider key={`jardinera-${i}`} args={[0.17, 2.3]} position={[c[0], c[1] + 0.17, c[2]]} />
        ))}

        {/* Troncos, farolas y postes */}
        {trunks.map((t, i) => (
          <CylinderCollider
            key={`tronco-${i}`}
            args={[t.h / 2, t.r * (t.scale ?? 1)]}
            position={[t.position[0], t.position[1] + t.h / 2, t.position[2]]}
          />
        ))}
        {/* Copas de árboles: sensores (no bloquean al personaje, pero sí a la cámara) */}
        {[...PROPS.tree.map((t) => ({ t, y: 2.8, r: 1.45 })), ...PROPS.pine.map((t) => ({ t, y: 2.6, r: 1.3 }))].map(({ t, y, r }, i) => (
          <BallCollider
            key={`copa-${i}`}
            sensor
            args={[r * (t.scale ?? 1)]}
            position={[t.position[0], t.position[1] + y * (t.scale ?? 1), t.position[2]]}
          />
        ))}
        {PROPS.bench.map((b, i) => (
          <CuboidCollider key={`banca-${i}`} args={[0.95, 0.5, 0.3]} position={[b.position[0], b.position[1] + 0.5, b.position[2]]} rotation={[0, b.rotationY ?? 0, 0]} />
        ))}
        {PARKED_CARS.map((c, i) => (
          <CuboidCollider key={`auto-${i}`} args={[1.8, 0.9, 0.85]} position={[c.position[0], 0.9, c.position[2]]} rotation={[0, c.rotationY, 0]} />
        ))}

        {/* Límites del mundo */}
        {[
          [0, -half - 1, half + 2, 1],
          [0, half + 1, half + 2, 1],
          [-half - 1, 0, 1, half + 2],
          [half + 1, 0, 1, half + 2],
        ].map(([x, z, hx, hz], i) => (
          <CuboidCollider key={`limite-${i}`} args={[hx, 10, hz]} position={[x, 10, z]} />
        ))}
      </RigidBody>

      {BUILDINGS.map((b) => (
        <BuildingColliders key={b.id} b={b} />
      ))}
    </>
  );
}
