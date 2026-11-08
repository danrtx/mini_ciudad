import type { ModelManifest } from '../../types/city';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Lee public/assets/models/manifest.json (lo escribe blender/generar_modelos.py).
 * Si no existe o es inválido, la ciudad usa los modelos procedurales de respaldo.
 */
export async function loadModelManifest(): Promise<ModelManifest> {
  const empty: ModelManifest = { buildings: {}, props: {} };
  try {
    const res = await fetch(assetUrl('assets/models/manifest.json'), { cache: 'no-cache' });
    if (!res.ok) return empty;
    const data = (await res.json()) as Partial<ModelManifest>;
    return { buildings: data.buildings ?? {}, props: data.props ?? {}, characters: data.characters ?? {} };
  } catch {
    return empty;
  }
}
