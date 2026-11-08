import { MousePointerClick } from 'lucide-react';
import { useEffect } from 'react';
import { BUILDINGS_BY_ID } from '../../data/buildings';
import { useGameStore } from '../../stores/useGameStore';
import { getInteractable } from '../../systems/interaction/interactables';
import { getGameCanvas } from '../../systems/movement/cameraState';

/**
 * Nombre del edificio apuntado, justo debajo de la mira.
 * Los interactivos invitan a hacer clic; los decorativos solo muestran su nombre.
 */
export function BuildingTooltip() {
  const hoveredId = useGameStore((s) => s.hoveredBuildingId);
  const selected = useGameStore((s) => s.selectedBuildingId || s.activeInteractionId);
  const objectId = useGameStore((s) => s.hoveredObjectId);
  const building = hoveredId ? BUILDINGS_BY_ID[hoveredId] : null;
  const object = getInteractable(objectId);

  // Cursor de "mano" sobre edificios interactivos cuando el puntero no está capturado
  useEffect(() => {
    const canvas = getGameCanvas();
    if (canvas) canvas.style.cursor = building?.interactive || object ? 'pointer' : '';
    return () => {
      if (canvas) canvas.style.cursor = '';
    };
  }, [building, object]);

  if (selected) return null;
  if (object) {
    return (
      <div className="building-tooltip is-interactive" role="status">
        <strong>{object.name}</strong>
        <span>
          <MousePointerClick size={13} aria-hidden /> Clic · {object.verb}
        </span>
      </div>
    );
  }
  if (!building) return null;
  return (
    <div className={`building-tooltip${building.interactive ? ' is-interactive' : ''}`} role="status">
      <strong>{building.name}</strong>
      {building.interactive ? (
        <span>
          <MousePointerClick size={13} aria-hidden /> Clic para ver
        </span>
      ) : (
        <span>Decorativo</span>
      )}
    </div>
  );
}
