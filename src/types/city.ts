/**
 * Tipos centrales de la ciudad.
 * Toda la configuración (edificios, calles, props, zonas) se describe con estas interfaces
 * para que el motor 3D, la UI y el script de Blender compartan una única fuente de verdad.
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export type InteriorId = 'cafeteria' | 'biblioteca';
export type SceneId = 'city' | InteriorId;

export type BuildingType =
  | 'cafeteria'
  | 'biblioteca'
  | 'tienda'
  | 'casa'
  | 'apartamentos'
  | 'oficinas'
  | 'ayuntamiento'
  | 'hotel'
  | 'panaderia';

export type RoofStyle = 'flat' | 'gable' | 'pyramid' | 'dome';

/** Parámetros visuales con los que se construye un edificio (procedural o en Blender). */
export interface BuildingStyle {
  width: number; // eje X local (fachada)
  depth: number; // eje Z local (fondo)
  height: number; // altura del cuerpo sin techo
  floors: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  windowColor: string;
  doorColor: string;
  roof: RoofStyle;
  awningColor?: string;
  signColor?: string;
  columns?: boolean;
  clockTower?: boolean;
  chimney?: boolean;
}

export interface BuildingConfig {
  /** Identificador único. También es el nombre del archivo GLB exportado desde Blender. */
  id: string;
  name: string;
  description: string;
  type: BuildingType;
  /** Posición en el mundo (centro de la base). */
  position: Vec3;
  /** Rotación en Y (radianes). La fachada local mira hacia +Z. */
  rotationY: number;
  /** ¿Se puede seleccionar / consultar? */
  interactive: boolean;
  /** Escena interior asociada (null si no se puede entrar). */
  interiorId: InteriorId | null;
  style: BuildingStyle;
  /** Datos adicionales opcionales que se muestran en el panel de información. */
  info?: Record<string, string>;
}

/** Rectángulo en el plano XZ: [xMin, zMin, xMax, zMax]. */
export type RectXZ = [number, number, number, number];

export interface StreetConfig {
  id: string;
  name: string;
  rect: RectXZ;
  /** Eje en el que corre la calle (para las líneas centrales). */
  axis: 'x' | 'z';
  /** Tramos (en el eje de la calle) donde NO se pintan líneas, p. ej. intersecciones. */
  gaps?: Vec2[];
}

export type PropKind = 'tree' | 'pine' | 'bush' | 'lamp' | 'bench' | 'fountain';

export interface PropTransform {
  position: Vec3;
  rotationY?: number;
  scale?: number;
}

/** Zonas lógicas del mapa (triggers): radiales (distanceTo) o cajas AABB (Box3). */
export type ZoneConfig =
  | { id: string; name: string; kind: 'radial'; center: Vec3; radius: number; priority: number }
  | { id: string; name: string; kind: 'box'; rect: RectXZ; priority: number };

/** Manifiesto de modelos GLB disponibles (lo genera el script de Blender). */
export interface ModelManifest {
  buildings: Record<string, string>;
  props: Partial<Record<PropKind, string>>;
  characters?: Record<string, string>;
}
