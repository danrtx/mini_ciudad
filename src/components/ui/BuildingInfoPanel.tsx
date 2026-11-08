import { DoorOpen, MapPin, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { BUILDINGS_BY_ID } from '../../data/buildings';
import { useGameStore } from '../../stores/useGameStore';
import { releasePointerLock } from '../../systems/movement/cameraState';
import { playerState } from '../../systems/movement/playerState';
import { BUILDING_ICONS, BUILDING_TYPE_LABEL } from './buildingIcons';

/**
 * Panel lateral con la información del edificio seleccionado.
 * Libera el puntero para poder usar los botones y bloquea el movimiento mientras está abierto.
 */
export function BuildingInfoPanel() {
  const selectedId = useGameStore((s) => s.selectedBuildingId);
  const selectBuilding = useGameStore((s) => s.selectBuilding);
  const enterInterior = useGameStore((s) => s.enterInterior);
  const building = selectedId ? BUILDINGS_BY_ID[selectedId] : null;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!building) return;
    releasePointerLock();
    closeRef.current?.focus();
  }, [building]);

  if (!building) return null;
  const Icon = BUILDING_ICONS[building.type];
  const close = () => selectBuilding(null);

  return (
    <aside className="panel info-panel" role="dialog" aria-labelledby="info-titulo" key={building.id}>
      <header className="info-header">
        <span className="info-icon" style={{ background: building.style.wallColor }}>
          <Icon size={22} aria-hidden />
        </span>
        <div>
          <p className="eyebrow">{BUILDING_TYPE_LABEL[building.type]}</p>
          <h2 id="info-titulo">{building.name}</h2>
        </div>
        <button ref={closeRef} className="btn btn--icon btn--ghost" onClick={close} aria-label="Cerrar (Esc)" title="Cerrar (Esc)">
          <X size={18} />
        </button>
      </header>

      <p className="info-description">{building.description}</p>

      {building.info && (
        <dl className="info-list">
          {Object.entries(building.info).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="info-coords">
        <MapPin size={13} aria-hidden /> X {building.position[0]} · Z {building.position[2]}
      </p>

      <div className="info-actions">
        {building.interiorId ? (
          <button
            className="btn btn--primary"
            onClick={() => {
              if (!building.interiorId) return;
              const pos = playerState.getPosition();
              // Orientación "hacia el edificio": al salir se invierte y el personaje mira a la calle
              const facing = pos ? Math.atan2(building.position[0] - pos[0], building.position[2] - pos[2]) : playerState.facing;
              enterInterior(building.interiorId, pos, facing);
            }}
          >
            <DoorOpen size={16} aria-hidden /> Entrar
          </button>
        ) : (
          <span className="info-note">Este edificio no tiene interior disponible.</span>
        )}
        <button className="btn" onClick={close}>
          Cerrar
        </button>
      </div>
    </aside>
  );
}
