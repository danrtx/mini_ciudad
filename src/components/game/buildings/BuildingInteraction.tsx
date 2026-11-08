import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../../stores/useGameStore';
import { SIDEWALKS } from '../../../data/cityLayout';
import { registerBuildingProxy } from '../../../systems/interaction/buildingPicker';
import type { BuildingConfig } from '../../../types/city';
import { doorPoint, rectContains } from '../../../utils/geometry2d';
import { FOUNDATION_HEIGHT, roofHeight } from './buildingLayout';

const ACCENT = '#ffb347';
const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });

function useBuildingVolume(b: BuildingConfig) {
  const s = b.style;
  const height = FOUNDATION_HEIGHT + s.height + roofHeight(s) + (s.clockTower ? 8 : 0);
  const extraFront = s.columns ? 3 : 0.6;
  return { width: s.width + 0.6, height, depth: s.depth + extraFront, zOffset: extraFront / 2 - 0.3 };
}

/**
 * Elementos de interacción de un edificio (en su espacio local):
 *  - Caja proxy invisible para el Raycasting (también en los decorativos, para tapar).
 *  - Contorno + volumen brillante cuando se apunta o se selecciona (solo interactivos).
 *  - Marcador flotante y anillo de entrada que se ilumina al acercarse (trigger de proximidad).
 */
export function BuildingInteraction({ config }: { config: BuildingConfig }) {
  const { width, height, depth, zOffset } = useBuildingVolume(config);
  const proxyRef = useRef<THREE.Mesh>(null);
  const highlighted = useGameStore(
    (s) => config.interactive && (s.hoveredBuildingId === config.id || s.selectedBuildingId === config.id),
  );
  const nearby = useGameStore((s) => s.nearbyBuildingId === config.id);

  useEffect(() => {
    const proxy = proxyRef.current;
    if (!proxy) return;
    proxy.userData = { buildingId: config.id, interactive: config.interactive };
    return registerBuildingProxy(proxy);
  }, [config.id, config.interactive]);

  const { edges, edgeMaterial, glowMaterial } = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth);
    return {
      edges: new THREE.EdgesGeometry(box),
      edgeMaterial: new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.95, depthTest: false }),
      glowMaterial: new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.1, depthWrite: false }),
    };
  }, [width, height, depth]);

  useEffect(
    () => () => {
      edges.dispose();
      edgeMaterial.dispose();
      glowMaterial.dispose();
    },
    [edges, edgeMaterial, glowMaterial],
  );

  return (
    <group>
      <mesh ref={proxyRef} position={[0, height / 2, zOffset]} scale={[width, height, depth]} material={proxyMaterial}>
        <boxGeometry />
      </mesh>
      {highlighted && (
        <group position={[0, height / 2, zOffset]}>
          <lineSegments geometry={edges} material={edgeMaterial} renderOrder={10} />
          <mesh scale={[width, height, depth]} material={glowMaterial}>
            <boxGeometry />
          </mesh>
        </group>
      )}
      {config.interactive && (
        <InteractiveMarker
          ringY={ringHeight(config)}
          height={height}
          doorZ={config.style.depth / 2 + (config.style.columns ? 3.9 : 1.6)}
          active={highlighted || nearby}
          nearby={nearby}
          hasInterior={Boolean(config.interiorId)}
        />
      )}
    </group>
  );
}

/** Rombo flotante sobre el edificio + anillo en el suelo frente a la puerta. */
function ringHeight(b: BuildingConfig): number {
  const [x, z] = doorPoint(b, b.style.columns ? 3.9 : 1.6);
  return SIDEWALKS.some((r) => rectContains(r, x, z)) ? 0.23 : 0.1;
}

function InteractiveMarker({
  ringY,
  height,
  doorZ,
  active,
  nearby,
  hasInterior,
}: {
  ringY: number;
  height: number;
  doorZ: number;
  active: boolean;
  nearby: boolean;
  hasInterior: boolean;
}) {
  const gemRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = hasInterior ? ACCENT : '#7cc6e8';
  const { gemMat, ringMat } = useMemo(
    () => ({
      gemMat: new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, flatShading: true }),
      ringMat: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    }),
    [color],
  );
  useEffect(
    () => () => {
      gemMat.dispose();
      ringMat.dispose();
    },
    [gemMat, ringMat],
  );

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const gem = gemRef.current;
    if (gem) {
      gem.rotation.y += delta * (active ? 2.4 : 1);
      gem.position.y = height + 2.2 + Math.sin(t * 2) * 0.35;
      const target = active ? 1.35 : 1;
      gem.scale.setScalar(gem.scale.x + (target - gem.scale.x) * Math.min(1, delta * 8));
    }
    gemMat.emissiveIntensity = active ? 1.2 + Math.sin(t * 6) * 0.3 : 0.6;
    ringMat.opacity = nearby ? 0.55 + Math.sin(t * 5) * 0.2 : 0.22;
    if (ringRef.current) ringRef.current.scale.setScalar(nearby ? 1 + Math.sin(t * 5) * 0.05 : 1);
  });

  return (
    <group>
      <mesh ref={gemRef} material={gemMat} position={[0, height + 2.2, 0]}>
        <octahedronGeometry args={[0.9, 0]} />
      </mesh>
      <mesh ref={ringRef} material={ringMat} position={[0, ringY, doorZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.45, 24]} />
      </mesh>
    </group>
  );
}
