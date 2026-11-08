import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../../stores/useGameStore';
import { assetUrl } from '../../../utils/assetUrl';
import { ModelErrorBoundary } from '../ModelErrorBoundary';
import { findRig, type CharacterRig } from './characterRig';
import { ProceduralCharacter } from './ProceduralCharacter';

interface Props {
  onRig: (rig: CharacterRig) => void;
}

function GLBCharacter({ url, onRig }: Props & { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    return clone;
  }, [scene]);
  useEffect(() => onRig(findRig(model)), [model, onRig]);
  return <primitive object={model} />;
}

function Procedural({ onRig }: Props) {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (ref.current) onRig(findRig(ref.current));
  }, [onRig]);
  return (
    <group ref={ref}>
      <ProceduralCharacter />
    </group>
  );
}

/** Usa personaje.glb de Blender si está en el manifiesto; si no, el personaje procedural. */
export function CharacterModel({ onRig }: Props) {
  const path = useGameStore((s) => s.manifest.characters?.personaje);
  const fallback = <Procedural onRig={onRig} />;
  if (!path) return fallback;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBCharacter url={assetUrl(path)} onRig={onRig} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
