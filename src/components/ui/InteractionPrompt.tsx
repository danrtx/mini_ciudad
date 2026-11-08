import { BUILDINGS_BY_ID } from '../../data/buildings';
import { isPlayerFrozen, useGameStore } from '../../stores/useGameStore';
import { activateInteractable, getInteractable } from '../../systems/interaction/interactables';

/**
 * Indicador de interacción por proximidad (también se puede tocar/hacer clic):
 *  - En la ciudad: «E · Ver Café Aurora»
 *  - En un interior: «E · Usar Máquina de café», «E · Salir a la ciudad»
 */
export function InteractionPrompt() {
  const nearbyBuildingId = useGameStore((s) => s.nearbyBuildingId);
  const objectId = useGameStore((s) => s.hoveredObjectId ?? s.nearbyObjectId);
  const frozen = useGameStore((s) => isPlayerFrozen(s));
  const inCity = useGameStore((s) => s.currentScene === 'city');
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  if (frozen) return null;

  if (inCity) {
    const building = nearbyBuildingId ? BUILDINGS_BY_ID[nearbyBuildingId] : null;
    if (!building) return null;
    return (
      <button className="interaction-prompt" onClick={() => selectBuilding(building.id)}>
        <kbd>E</kbd>
        <span>
          Ver <strong>{building.name}</strong>
        </span>
      </button>
    );
  }

  const entry = getInteractable(objectId);
  if (!entry) return null;
  return (
    <button className="interaction-prompt" onClick={() => activateInteractable(entry.id)}>
      <kbd>E</kbd>
      <span>
        {entry.verb} <strong>{entry.name}</strong>
      </span>
    </button>
  );
}
