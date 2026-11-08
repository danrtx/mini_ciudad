import * as THREE from 'three';
import { DEFAULT_ZONE_NAME, ZONES } from '../../data/cityLayout';

/**
 * Detección de zonas lógicas (triggers) vista en clase:
 *  - Radial: Vector3.distanceTo(centro) < radio
 *  - AABB:   Box3.containsPoint(posición)
 * Los objetos se crean una sola vez; la consulta no reserva memoria por fotograma.
 */

type CompiledZone =
  | { id: string; name: string; priority: number; kind: 'radial'; center: THREE.Vector3; radius: number }
  | { id: string; name: string; priority: number; kind: 'box'; box: THREE.Box3 };

const compiled: CompiledZone[] = ZONES.map((z): CompiledZone =>
  z.kind === 'radial'
    ? { id: z.id, name: z.name, priority: z.priority, kind: 'radial', center: new THREE.Vector3(...z.center), radius: z.radius }
    : {
        id: z.id,
        name: z.name,
        priority: z.priority,
        kind: 'box',
        box: new THREE.Box3(new THREE.Vector3(z.rect[0], -5, z.rect[1]), new THREE.Vector3(z.rect[2], 60, z.rect[3])),
      },
).sort((a, b) => b.priority - a.priority);

const flat = new THREE.Vector3();

export interface ZoneHit {
  id: string | null;
  name: string;
}

export function detectZone(point: THREE.Vector3): ZoneHit {
  for (const zone of compiled) {
    if (zone.kind === 'radial') {
      flat.set(point.x, zone.center.y, point.z);
      if (flat.distanceTo(zone.center) < zone.radius) return { id: zone.id, name: zone.name };
    } else if (zone.box.containsPoint(point)) {
      return { id: zone.id, name: zone.name };
    }
  }
  return { id: null, name: DEFAULT_ZONE_NAME };
}
