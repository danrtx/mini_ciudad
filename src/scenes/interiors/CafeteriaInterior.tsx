import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Interactable } from '../../components/game/interactables/Interactable';
import { CAFETERIA_CONTENT as C, MENU_BOARD_LINES } from '../../data/interiorContent';
import { INTERIORS } from '../../data/interiors';
import { GEO, getMaterial } from '../../utils/sharedResources';
import { getTextTexture } from '../../utils/textTexture';
import { PendantLamp, PottedPlant, RoundTable, Rug, TextBoard } from './furniture';
import { Box, InteriorRoom, SolidBox, type RoomPalette } from './InteriorRoom';

const PALETTE: RoomPalette = {
  floor: ['#b98a5e', '#a77a50'],
  wall: '#f7e6d3',
  wainscot: '#c4553f',
  trim: '#fff4e6',
  ceiling: '#f2e2cf',
  background: '#2b2220',
  lightColor: '#ffd9a8',
};

const STEAM_COUNT = 60;
const BREW_SECONDS = 4.5;

/**
 * Máquina de espresso animada: al activarla se enciende el piloto, sale vapor (partículas en
 * Float32Array recicladas) y la taza se llena poco a poco.
 */
function CoffeeMachine({ position }: { position: [number, number, number] }) {
  const brew = useRef(-1); // segundos desde que se activó (−1 = apagada)
  const coffeeRef = useRef<THREE.Mesh>(null);
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3a3a', emissive: '#53d88a', emissiveIntensity: 0 }), []);
  const steam = useMemo(() => {
    const positions = new Float32Array(STEAM_COUNT * 3).fill(-50);
    const life = new Float32Array(STEAM_COUNT);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0.7, depthWrite: false });
    return { geo, mat, life };
  }, []);

  useEffect(
    () => () => {
      lightMat.dispose();
      steam.geo.dispose();
      steam.mat.dispose();
    },
    [lightMat, steam],
  );

  const start = useCallback(() => {
    brew.current = 0;
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const pos = steam.geo.attributes.position.array as Float32Array;
    const brewing = brew.current >= 0 && brew.current < BREW_SECONDS;
    if (brew.current >= 0) brew.current += delta;
    if (brew.current > BREW_SECONDS + 6) brew.current = -1; // la taza se "toma" y queda lista otra vez

    lightMat.emissiveIntensity = brewing ? 1.5 + Math.sin(brew.current * 10) * 0.5 : brew.current >= 0 ? 0.6 : 0;
    const level = brew.current < 0 ? 0 : Math.min(1, brew.current / BREW_SECONDS);
    if (coffeeRef.current) {
      coffeeRef.current.visible = level > 0.02;
      coffeeRef.current.scale.y = Math.max(0.01, level) * 0.16;
      coffeeRef.current.position.y = 0.03 + coffeeRef.current.scale.y / 2;
    }

    for (let i = 0; i < STEAM_COUNT; i++) {
      const ix = i * 3;
      steam.life[i] -= delta;
      if (steam.life[i] <= 0) {
        if (brewing || (brew.current >= 0 && Math.random() < 0.05)) {
          steam.life[i] = 1 + Math.random() * 0.8;
          pos[ix] = (Math.random() - 0.5) * 0.12;
          pos[ix + 1] = 0.22;
          pos[ix + 2] = (Math.random() - 0.5) * 0.1;
        } else pos[ix + 1] = -50;
        continue;
      }
      pos[ix] += Math.sin(steam.life[i] * 6 + i) * delta * 0.08;
      pos[ix + 1] += delta * 0.55;
    }
    steam.geo.attributes.position.needsUpdate = true;
  });

  const steel = getMaterial('#c9ced6', { roughness: 0.3, metalness: 0.6 });
  return (
    <Interactable
      id="maquina-cafe"
      name={C.maquina.name}
      verb={C.maquina.verb}
      description={C.maquina.description}
      details={C.maquina.details}
      position={position}
      size={[1.1, 0.95, 0.75]}
      radius={2.3}
      onActivate={start}
    >
      <mesh geometry={GEO.box} material={steel} position={[0, 0.42, -0.05]} scale={[1, 0.8, 0.55]} castShadow />
      <mesh geometry={GEO.box} material={getMaterial('#c4553f')} position={[0, 0.55, 0.23]} scale={[0.9, 0.3, 0.04]} />
      <mesh geometry={GEO.box} material={steel} position={[0, 0.88, -0.05]} scale={[1.05, 0.08, 0.6]} />
      {/* Tazas calentándose arriba */}
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <mesh key={x} geometry={GEO.cylinder8} material={getMaterial('#ffffff')} position={[x, 0.98, -0.05]} scale={[0.14, 0.12, 0.14]} />
      ))}
      {/* Grupo de extracción + taza */}
      <mesh geometry={GEO.cylinder8} material={getMaterial('#3a3a3a')} position={[0, 0.38, 0.3]} scale={[0.16, 0.12, 0.16]} />
      <mesh geometry={GEO.box} material={getMaterial('#3a3a3a')} position={[0.18, 0.38, 0.38]} scale={[0.25, 0.04, 0.04]} />
      <group position={[0, 0.02, 0.32]}>
        <mesh geometry={GEO.cylinder8} material={getMaterial('#ffffff')} position={[0, 0.1, 0]} scale={[0.2, 0.2, 0.2]} castShadow />
        <mesh ref={coffeeRef} geometry={GEO.cylinder8} material={getMaterial('#5b3a29')} scale={[0.17, 0.01, 0.17]} visible={false} />
        <points geometry={steam.geo} material={steam.mat} frustumCulled={false} />
      </group>
      <mesh geometry={GEO.box} material={lightMat} position={[0.36, 0.72, 0.24]} scale={[0.07, 0.07, 0.03]} />
    </Interactable>
  );
}

function Counter() {
  const signMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: getTextTexture('CAFÉ AURORA', { background: '#5b3a29', color: '#fff4e6' }) }),
    [],
  );
  useEffect(() => () => signMat.dispose(), [signMat]);
  return (
    <group>
      {/* Mueble del mostrador */}
      <SolidBox size={[6.6, 1.05, 0.95]} position={[-2.7, 0.62, -3.5]} color="#c4553f" />
      <Box size={[6.8, 0.08, 1.1]} position={[-2.7, 1.18, -3.5]} color="#6b4a32" />
      {[-5.4, -3.6, -1.8, 0].map((x) => (
        <Box key={x} size={[0.06, 0.9, 0.02]} position={[x + 0.3, 0.62, -3.01]} color="#fff4e6" />
      ))}
      {/* Estantes con frascos y tazas */}
      {[2.1, 2.8].map((y) => (
        <group key={y}>
          <Box size={[6.4, 0.07, 0.4]} position={[-2.9, y, -5.12]} color="#8a5a3b" />
          {Array.from({ length: 9 }, (_, i) => (
            <mesh
              key={i}
              geometry={i % 3 === 0 ? GEO.cylinder8 : GEO.cylinder6}
              material={getMaterial(['#fffaf0', '#7cc6e8', '#f2b45a', '#e8735a'][(i + Math.round(y)) % 4])}
              position={[-5.7 + i * 0.68, y + 0.17, -5.1]}
              scale={[0.22, 0.28, 0.22]}
              castShadow
            />
          ))}
        </group>
      ))}
      <mesh geometry={GEO.plane} material={signMat} position={[-2.9, 3.55, -5.33]} scale={[3.4, 0.85, 1]} />
      {/* Caja registradora */}
      <Box size={[0.6, 0.35, 0.45]} position={[-0.8, 1.4, -3.55]} color="#2f3640" />
      <Box size={[0.5, 0.25, 0.05]} position={[-0.8, 1.68, -3.68]} color="#53d88a" rotation={[-0.4, 0, 0]} />
      {/* Vitrina de postres */}
      <Interactable
        id="vitrina"
        name={C.vitrina.name}
        verb={C.vitrina.verb}
        description={C.vitrina.description}
        details={C.vitrina.details}
        position={[-2.4, 1.22, -3.45]}
        size={[1.6, 0.62, 0.8]}
      >
        <mesh
          geometry={GEO.box}
          material={getMaterial('#dff4ff', { transparent: true, opacity: 0.35, roughness: 0.1 })}
          position={[0, 0.3, 0]}
          scale={[1.5, 0.58, 0.72]}
        />
        {['#f2b45a', '#e8735a', '#7a4a32', '#f6c6a8', '#ffd166'].map((c, i) => (
          <mesh key={c} geometry={GEO.ico} material={getMaterial(c)} position={[-0.56 + i * 0.28, 0.12, (i % 2) * 0.18 - 0.08]} scale={0.22} />
        ))}
      </Interactable>
      {/* Zona de pedidos (mostrador interactivo) */}
      <Interactable
        id="mostrador"
        name={C.mostrador.name}
        verb={C.mostrador.verb}
        description={C.mostrador.description}
        details={C.mostrador.details}
        position={[-0.6, 0, -3.5]}
        size={[1.8, 1.9, 1.1]}
        radius={2.2}
      />
    </group>
  );
}

/** Interior de la cafetería (carga diferida). */
export default function CafeteriaInterior() {
  const cfg = INTERIORS.cafeteria;
  return (
    <InteriorRoom config={cfg} palette={PALETTE}>
      <Counter />
      <CoffeeMachine position={[-4.6, 1.22, -3.55]} />

      <Interactable
        id="pizarra"
        name={C.pizarra.name}
        verb={C.pizarra.verb}
        description={C.pizarra.description}
        details={C.pizarra.details}
        position={[4.2, 1.6, -5.3]}
        size={[2.4, 1.8, 0.4]}
        radius={2.6}
      >
        <TextBoard lines={MENU_BOARD_LINES} position={[0, 0.9, 0.04]} size={[2.2, 1.6]} />
      </Interactable>

      <RoundTable position={[3.6, 0, -1.6]} />
      <RoundTable position={[4.8, 0, 2.2]} chairs={3} />
      <RoundTable position={[-4.4, 0, 1.4]} chairs={3} />
      <RoundTable position={[-2.2, 0, -0.6]} />

      <PendantLamp position={[3.6, 4.4, -1.6]} color="#c4553f" length={1.4} />
      <PendantLamp position={[4.8, 4.4, 2.2]} color="#4f9d69" length={1.4} />
      <PendantLamp position={[-4.4, 4.4, 1.4]} color="#3d5a80" length={1.4} />
      <PendantLamp position={[-2.2, 4.4, -0.6]} color="#c4553f" length={1.4} />

      <PottedPlant position={[6.2, 0, -4.7]} />
      <PottedPlant position={[-6.2, 0, 4.6]} scale={1.2} />
      <PottedPlant position={[6.2, 0, 4.6]} scale={1.1} />
      <Rug position={[0, 0, 3.4]} size={[3.2, 2.2]} color="#e8735a" border="#fff4e6" />
    </InteriorRoom>
  );
}
