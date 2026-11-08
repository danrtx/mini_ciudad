import { Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { getInteractable } from '../../systems/interaction/interactables';
import { releasePointerLock } from '../../systems/movement/cameraState';

/** Ventana informativa genérica para cualquier objeto interactivo con descripción. */
export function ObjectInfoPanel() {
  const activeId = useGameStore((s) => s.activeInteractionId);
  const close = useGameStore((s) => s.setActiveInteraction);
  const entry = getInteractable(activeId);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!entry) return;
    releasePointerLock();
    closeRef.current?.focus();
  }, [entry]);

  if (!entry) return null;
  return (
    <aside className="panel info-panel" role="dialog" aria-labelledby="objeto-titulo" key={entry.id}>
      <header className="info-header">
        <span className="info-icon" style={{ background: '#fde2d9' }}>
          <Info size={22} aria-hidden />
        </span>
        <div>
          <p className="eyebrow">Objeto</p>
          <h2 id="objeto-titulo">{entry.name}</h2>
        </div>
        <button ref={closeRef} className="btn btn--icon btn--ghost" onClick={() => close(null)} aria-label="Cerrar (Esc)" title="Cerrar (Esc)">
          <X size={18} />
        </button>
      </header>
      {entry.description && <p className="info-description">{entry.description}</p>}
      {entry.details && (
        <dl className="info-list">
          {Object.entries(entry.details).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="info-actions">
        <button className="btn" onClick={() => close(null)}>
          Cerrar
        </button>
      </div>
    </aside>
  );
}
