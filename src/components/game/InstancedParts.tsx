import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PropTransform } from '../../types/city';

/** Una pieza (geometría + material) que se repite en muchas posiciones. */
export interface InstancedPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Colores por instancia (variación sin crear materiales nuevos). */
  tints?: readonly string[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

interface InstancedPartsProps {
  parts: InstancedPart[];
  transforms: PropTransform[];
  seed?: number;
}

const tmpObject = new THREE.Object3D();
const tmpColor = new THREE.Color();

/**
 * Dibuja N copias de un objeto compuesto usando un InstancedMesh por pieza.
 * 150 árboles × 2 piezas = 2 draw calls en lugar de 300.
 */
export function InstancedParts({ parts, transforms, seed = 0 }: InstancedPartsProps) {
  return (
    <group>
      {parts.map((part, i) => (
        <InstancedPartMesh key={i} part={part} transforms={transforms} seed={seed + i * 17} />
      ))}
    </group>
  );
}

function InstancedPartMesh({ part, transforms, seed }: { part: InstancedPart; transforms: PropTransform[]; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = transforms.length;
  const tintColors = useMemo(() => part.tints?.map((c) => new THREE.Color(c)), [part.tints]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    transforms.forEach((t, i) => {
      tmpObject.position.set(t.position[0], t.position[1], t.position[2]);
      tmpObject.rotation.set(0, t.rotationY ?? 0, 0);
      tmpObject.scale.setScalar(t.scale ?? 1);
      tmpObject.updateMatrix();
      mesh.setMatrixAt(i, tmpObject.matrix);
      if (tintColors) {
        const idx = Math.abs((i * 7 + seed * 13 + Math.floor(t.position[0] * 3))) % tintColors.length;
        mesh.setColorAt(i, tmpColor.copy(tintColors[idx]));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [transforms, tintColors, seed]);

  if (count === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, count]}
      castShadow={part.castShadow ?? true}
      receiveShadow={part.receiveShadow ?? true}
    />
  );
}

/** Variante para cajas con escala no uniforme (franjas, setos, ventanas...). */
export interface BoxInstance {
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
  /** Color por instancia (usar con un material blanco). */
  color?: string;
}

export function InstancedBoxes({
  boxes,
  material,
  castShadow = false,
  receiveShadow = true,
}: {
  boxes: BoxInstance[];
  material: THREE.Material;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    boxes.forEach((b, i) => {
      tmpObject.position.set(...b.position);
      tmpObject.rotation.set(0, b.rotationY ?? 0, 0);
      tmpObject.scale.set(...b.size);
      tmpObject.updateMatrix();
      mesh.setMatrixAt(i, tmpObject.matrix);
      if (b.color) mesh.setColorAt(i, tmpColor.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  if (boxes.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, boxes.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}
