import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PARK } from '../../data/cityLayout';
import { useGameStore } from '../../stores/useGameStore';
import { playSfx, type SoundName } from '../audio/audioManager';
import { playerState } from '../movement/playerState';

/**
 * Triggers de eventos (requisito del curso: 1 radial con distanceTo + 1 caja AABB con Box3).
 * Cada trigger guarda si el jugador está dentro y un cooldown, para disparar el evento
 * solo al ENTRAR y no repetirlo en cada fotograma.
 * Los objetos THREE se crean una vez; en el bucle no se reserva memoria.
 */
interface TriggerDef {
  id: string;
  shape: { kind: 'radial'; center: THREE.Vector3; radius: number } | { kind: 'box'; box: THREE.Box3 };
  cooldown: number;
  sound: SoundName;
  title: string;
  text: string;
}

const pos = new THREE.Vector3();
const flat = new THREE.Vector3();

export function TriggerSystem() {
  const triggers = useMemo<TriggerDef[]>(() => {
    const [fx, fy, fz] = PARK.fountainCenter;
    const [x0, z0, x1, z1] = PARK.rect;
    return [
      {
        id: 'fuente',
        shape: { kind: 'radial', center: new THREE.Vector3(fx, fy, fz), radius: 6 },
        cooldown: 12,
        sound: 'burbuja',
        title: 'Fuente del Parque',
        text: 'Escucha: el sonido del agua sube al acercarte (audio posicional).',
      },
      {
        id: 'parque',
        shape: { kind: 'box', box: new THREE.Box3(new THREE.Vector3(x0, -2, z0), new THREE.Vector3(x1, 10, z1)) },
        cooldown: 20,
        sound: 'campanitas',
        title: 'Bienvenido al Parque Central',
        text: 'Hay pelotas para patear junto a la fuente.',
      },
    ];
  }, []);

  const state = useRef(triggers.map(() => ({ inside: false, lastFired: -Infinity })));

  useFrame(({ clock }) => {
    const store = useGameStore.getState();
    const player = playerState.object;
    if (!player || store.phase !== 'playing' || store.currentScene !== 'city' || store.transition.active) return;
    player.getWorldPosition(pos);
    const now = clock.elapsedTime;

    triggers.forEach((t, i) => {
      let inside: boolean;
      if (t.shape.kind === 'radial') {
        flat.set(pos.x, t.shape.center.y, pos.z);
        inside = flat.distanceTo(t.shape.center) < t.shape.radius;
      } else {
        inside = t.shape.box.containsPoint(pos);
      }
      const s = state.current[i];
      if (inside && !s.inside && now - s.lastFired > t.cooldown) {
        s.lastFired = now;
        playSfx(t.sound);
        store.showToast(t.title, t.text);
      }
      s.inside = inside;
    });
  });

  return null;
}
