import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { telemetry } from './telemetry';

/** Mide los FPS reales (fotogramas por segundo) y los deja en `telemetry` para el HUD. */
export function FpsMeter() {
  const frames = useRef(0);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    frames.current++;
    elapsed.current += delta;
    if (elapsed.current >= 0.5) {
      telemetry.fps = Math.round(frames.current / elapsed.current);
      frames.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}
