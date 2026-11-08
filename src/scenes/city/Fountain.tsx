import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ModelErrorBoundary } from '../../components/game/ModelErrorBoundary';
import { PALETTE } from '../../data/palette';
import { useGameStore } from '../../stores/useGameStore';
import type { Vec3 } from '../../types/city';
import { assetUrl } from '../../utils/assetUrl';
import { GEO, getMaterial } from '../../utils/sharedResources';
import { audioState, loadSound, subscribeAudio } from '../../systems/audio/audioManager';

const PARTICLE_COUNT = 420;
const GRAVITY = -9.8;

/**
 * Chorro de agua con partículas en GPU (BufferGeometry + Float32Array), como en la Semana 9/10.
 * Las partículas se reciclan (pooling): ninguna se crea dentro del bucle de animación.
 */
function WaterParticles({ origin }: { origin: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { geometry, velocities, material } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Repartir el "nacimiento" de cada gota para que el chorro sea continuo desde el inicio
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 1] = -100;
      vel[i * 3 + 1] = -Math.random() * 6;
    }
    const mat = new THREE.PointsMaterial({ color: '#d9f3ff', size: 0.16, transparent: true, opacity: 0.85, depthWrite: false });
    return { geometry: geo, velocities: vel, material: mat };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      velocities[ix + 1] += GRAVITY * delta;
      pos[ix] += velocities[ix] * delta;
      pos[ix + 1] += velocities[ix + 1] * delta;
      pos[ix + 2] += velocities[ix + 2] * delta;
      if (pos[ix + 1] < 0.45) {
        // Reciclar la gota en la boquilla superior
        const angle = Math.random() * Math.PI * 2;
        const spread = 0.6 + Math.random() * 1.1;
        pos[ix] = 0;
        pos[ix + 1] = origin;
        pos[ix + 2] = 0;
        velocities[ix] = Math.cos(angle) * spread;
        velocities[ix + 1] = 3.2 + Math.random() * 1.6;
        velocities[ix + 2] = Math.sin(angle) * spread;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

function ProceduralFountain() {
  const stone = getMaterial(PALETTE.stone);
  const water = getMaterial(PALETTE.water, { roughness: 0.15, metalness: 0.1, emissive: PALETTE.water, emissiveIntensity: 0.15 });
  return (
    <group>
      <mesh geometry={GEO.cylinder12} material={stone} position={[0, 0.3, 0]} scale={[7, 0.6, 7]} castShadow receiveShadow />
      <mesh geometry={GEO.cylinder12} material={water} position={[0, 0.55, 0]} scale={[6.3, 0.12, 6.3]} receiveShadow />
      <mesh geometry={GEO.cylinder8} material={stone} position={[0, 1.2, 0]} scale={[0.8, 1.6, 0.8]} castShadow />
      <mesh geometry={GEO.cylinder12} material={stone} position={[0, 2.05, 0]} scale={[3, 0.3, 3]} castShadow />
      <mesh geometry={GEO.cylinder12} material={water} position={[0, 2.18, 0]} scale={[2.6, 0.08, 2.6]} />
      <mesh geometry={GEO.cylinder8} material={stone} position={[0, 2.6, 0]} scale={[0.35, 0.9, 0.35]} castShadow />
      <mesh geometry={GEO.ico} material={water} position={[0, 3.15, 0]} scale={[0.7, 0.7, 0.7]} />
    </group>
  );
}

function GLBFountain({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={model} />;
}

/**
 * Emisor de audio posicional anclado a la copa de la fuente (como en la Semana 9):
 * se escucha al 100 % a 3 m y deja de oírse a ~16 m. Dentro de un interior (a 600 m) queda en silencio.
 */
function FountainAudio() {
  const groupRef = useRef<THREE.Group>(null);
  useEffect(() => {
    const group = groupRef.current;
    let sound: THREE.PositionalAudio | null = null;
    let cancelled = false;

    const tryStart = () => {
      const listener = audioState.listener;
      if (cancelled || !group || !listener || !audioState.unlocked || sound) return;
      sound = new THREE.PositionalAudio(listener);
      sound.setRefDistance(3);
      sound.setMaxDistance(16);
      sound.setDistanceModel('linear');
      sound.setRolloffFactor(1);
      sound.setLoop(true);
      sound.setVolume(0.9);
      group.add(sound);
      const s = sound;
      loadSound('agua_fuente')
        .then((buffer) => {
          if (cancelled) return;
          s.setBuffer(buffer);
          s.play();
        })
        .catch(() => undefined);
    };

    tryStart();
    const unsubscribe = subscribeAudio(tryStart);
    return () => {
      cancelled = true;
      unsubscribe();
      if (sound) {
        if (sound.isPlaying) sound.stop();
        sound.parent?.remove(sound);
        sound.disconnect();
      }
    };
  }, []);
  return <group ref={groupRef} position={[0, 1.2, 0]} name="emisor-audio-fuente" />;
}

export function Fountain({ position }: { position: Vec3 }) {
  const modelPath = useGameStore((s) => s.manifest.props.fountain);
  const fallback = <ProceduralFountain />;
  return (
    <group position={position} name="fuente">
      {modelPath ? (
        <ModelErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <GLBFountain url={assetUrl(modelPath)} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        fallback
      )}
      <WaterParticles origin={3.3} />
      <FountainAudio />
    </group>
  );
}
