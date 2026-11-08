/**
 * Datos que cambian cada fotograma (posición, zona, FPS).
 * Es un objeto mutable fuera de React: el bucle 3D escribe aquí y el HUD lo lee
 * a baja frecuencia, evitando re-renderizar componentes en cada frame.
 */
export const telemetry = {
  x: 0,
  y: 0,
  z: 0,
  zoneId: null as string | null,
  zoneName: 'Explorando la ciudad',
  fps: 0,
};
