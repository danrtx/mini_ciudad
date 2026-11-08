import type { BuildingConfig } from '../types/city';
import raw from './buildings.json';

/**
 * Configuración de los 10 edificios.
 * Los datos viven en buildings.json porque el script de Blender (blender/generar_modelos.py)
 * lee el mismo archivo para modelar cada edificio con las mismas medidas.
 */
export const BUILDINGS = raw as BuildingConfig[];

export const BUILDINGS_BY_ID: Record<string, BuildingConfig> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);
