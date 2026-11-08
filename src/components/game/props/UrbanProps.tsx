import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { PROPS } from '../../../data/cityLayout';
import { useGameStore } from '../../../stores/useGameStore';
import type { PropKind, PropTransform } from '../../../types/city';
import { assetUrl } from '../../../utils/assetUrl';
import { InstancedParts, type InstancedPart } from '../InstancedParts';
import { ModelErrorBoundary } from '../ModelErrorBoundary';
import { getProceduralPropParts } from './propParts';

type InstancedKind = Exclude<PropKind, 'fountain'>;

/** Convierte las mallas de un GLB en piezas instanciables (una por malla/material). */
function GLBInstancedProp({ kind, url, transforms }: { kind: InstancedKind; url: string; transforms: PropTransform[] }) {
  const { scene } = useGLTF(url);
  const parts = useMemo<InstancedPart[]>(() => {
    scene.updateMatrixWorld(true);
    const procedural = getProceduralPropParts(kind);
    const out: InstancedPart[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      let material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      // Misma pieza en el modelo procedural con variación de color → material blanco + tinte por instancia
      const tints = procedural.length === countMeshes(scene) ? procedural[out.length]?.tints : undefined;
      if (tints && material instanceof THREE.MeshStandardMaterial) {
        material = material.clone();
        (material as THREE.MeshStandardMaterial).color.set('#ffffff');
      }
      out.push({ geometry, material, tints });
    });
    return out;
  }, [scene, kind]);
  return <InstancedParts parts={parts} transforms={transforms} seed={kind.length} />;
}

function countMeshes(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n++;
  });
  return n;
}

function UrbanProp({ kind }: { kind: InstancedKind }) {
  const modelPath = useGameStore((s) => s.manifest.props[kind]);
  const transforms = PROPS[kind];
  const procedural = <InstancedParts parts={getProceduralPropParts(kind)} transforms={transforms} seed={kind.length} />;

  if (!modelPath) return procedural;
  return (
    <ModelErrorBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <GLBInstancedProp kind={kind} url={assetUrl(modelPath)} transforms={transforms} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/** Árboles, pinos, arbustos, farolas y bancas de toda la ciudad (instanciados). */
export function UrbanProps() {
  return (
    <group name="mobiliario-urbano">
      <UrbanProp kind="tree" />
      <UrbanProp kind="pine" />
      <UrbanProp kind="bush" />
      <UrbanProp kind="lamp" />
      <UrbanProp kind="bench" />
    </group>
  );
}
