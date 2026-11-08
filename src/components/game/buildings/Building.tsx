import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { useClockHands } from '../../../hooks/useClockHands';
import { SIDEWALKS } from '../../../data/cityLayout';
import { PALETTE } from '../../../data/palette';
import { useGameStore } from '../../../stores/useGameStore';
import type { BuildingConfig } from '../../../types/city';
import { assetUrl } from '../../../utils/assetUrl';
import { facingDirection, rectContains } from '../../../utils/geometry2d';
import { GEO, getMaterial } from '../../../utils/sharedResources';
import { ModelErrorBoundary } from '../ModelErrorBoundary';
import { BuildingInteraction } from './BuildingInteraction';
import { ProceduralBuilding } from './ProceduralBuilding';

/** Modelo exportado desde Blender. Se clona para poder reutilizar la caché de useGLTF. */
function GLBBuilding({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  // Las manecillas exportadas desde Blender se llaman igual que en el script
  const hands = useMemo(
    () => ({ hour: model.getObjectByName('manecilla_hora'), minute: model.getObjectByName('manecilla_minuto') }),
    [model],
  );
  useClockHands(() => hands);
  return <primitive object={model} />;
}

/** Distancia desde la puerta hasta la acera más cercana, para dibujar el caminito de entrada. */
function walkwayLength(b: BuildingConfig): number {
  const [dx, dz] = facingDirection(b.rotationY);
  const startX = b.position[0] + dx * (b.style.depth / 2);
  const startZ = b.position[2] + dz * (b.style.depth / 2);
  for (let t = 0; t <= 10; t += 0.25) {
    if (SIDEWALKS.some((r) => rectContains(r, startX + dx * t, startZ + dz * t))) return t;
  }
  return 0;
}

export function Building({ config }: { config: BuildingConfig }) {
  const modelPath = useGameStore((s) => s.manifest.buildings[config.id]);
  const walk = useMemo(() => walkwayLength(config), [config]);
  const procedural = <ProceduralBuilding config={config} />;

  return (
    <group
      name={`edificio-${config.id}`}
      position={config.position}
      rotation={[0, config.rotationY, 0]}
      userData={{ buildingId: config.id, interactive: config.interactive }}
    >
      {modelPath ? (
        <ModelErrorBoundary fallback={procedural}>
          <Suspense fallback={procedural}>
            <GLBBuilding url={assetUrl(modelPath)} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        procedural
      )}
      <BuildingInteraction config={config} />
      {walk > 0.3 && (
        <mesh
          geometry={GEO.box}
          material={getMaterial(PALETTE.path)}
          position={[0, 0.04, config.style.depth / 2 + walk / 2]}
          scale={[2.2, 0.08, walk]}
          receiveShadow
        />
      )}
    </group>
  );
}
