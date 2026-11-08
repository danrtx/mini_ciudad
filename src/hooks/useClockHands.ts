import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';

/** Ángulos (rad, sentido horario visto de frente) de las manecillas para la hora actual. */
export function clockAngles(now = new Date()) {
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  return { hour: -(hours / 12) * Math.PI * 2, minute: -(minutes / 60) * Math.PI * 2 };
}

/** Actualiza una vez por segundo la rotación Z de las manecillas recibidas. */
export function useClockHands(getHands: () => { hour?: THREE.Object3D | null; minute?: THREE.Object3D | null }) {
  const last = useRef(-1);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 1) return;
    last.current = clock.elapsedTime;
    const { hour, minute } = getHands();
    if (!hour && !minute) return;
    const a = clockAngles();
    if (hour) hour.rotation.z = a.hour;
    if (minute) minute.rotation.z = a.minute;
  });
}
