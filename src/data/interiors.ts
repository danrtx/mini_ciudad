import type { InteriorId, Vec3 } from '../types/city';

/**
 * Configuración de las escenas interiores.
 * Cada interior vive lejos de la ciudad (en `origin`), así la ciudad sigue montada (su estado
 * se conserva) pero no se ve ni interfiere. Las coordenadas de spawn y salida son locales.
 */
export interface InteriorConfig {
  id: InteriorId;
  name: string;
  /** Edificio de la ciudad que da acceso a este interior. */
  buildingId: string;
  origin: Vec3;
  /** Medidas de la sala: ancho (X), fondo (Z), alto. */
  size: [number, number, number];
  spawn: Vec3;
  spawnFacing: number;
  /** Distancia máxima de la cámara dentro (salas pequeñas). */
  cameraMaxDistance: number;
}

export const INTERIORS: Record<InteriorId, InteriorConfig> = {
  cafeteria: {
    id: 'cafeteria',
    name: 'Café Aurora',
    buildingId: 'cafe-aurora',
    origin: [600, 0, 0],
    size: [14, 11, 4.4],
    spawn: [0, 1.1, 1.4],
    spawnFacing: Math.PI,
    cameraMaxDistance: 5.5,
  },
  biblioteca: {
    id: 'biblioteca',
    name: 'Biblioteca Municipal',
    buildingId: 'biblioteca-municipal',
    origin: [-600, 0, 0],
    size: [18, 15, 6],
    spawn: [0, 1.1, 3.4],
    spawnFacing: Math.PI,
    cameraMaxDistance: 6.5,
  },
};

export const CITY_CAMERA_MAX_DISTANCE = 13;

/** Convierte una posición local del interior a coordenadas del mundo. */
export function interiorToWorld(id: InteriorId, local: Vec3): Vec3 {
  const o = INTERIORS[id].origin;
  return [o[0] + local[0], o[1] + local[1], o[2] + local[2]];
}
