/**
 * Construye la URL de un recurso de /public respetando `base` de Vite.
 * Evita rutas absolutas que se rompen si la app se despliega en un subdirectorio.
 *   assetUrl('assets/models/buildings/cafe-aurora.glb')
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
}
