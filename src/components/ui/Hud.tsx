import { LogOut, MapPin, MousePointer2, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/useGameStore';
import { isPointerLocked } from '../../systems/movement/cameraState';
import { telemetry } from '../../systems/telemetry';
import { BuildingInfoPanel } from './BuildingInfoPanel';
import { ObjectInfoPanel } from './ObjectInfoPanel';
import { SoundToggle } from './SoundToggle';
import { ToastMessage } from './ToastMessage';
import { BuildingTooltip } from './BuildingTooltip';
import { InteractionPrompt } from './InteractionPrompt';
import { VirtualJoystick } from './VirtualJoystick';
import { ControlsList } from './ControlsList';

/**
 * HUD superpuesto al Canvas: zona actual + coordenadas en tiempo real.
 * Lee `telemetry` cada 100 ms y escribe directo en el DOM (sin re-render de React por frame).
 */
export function Hud() {
  const pause = useGameStore((s) => s.pause);
  const panelOpen = useGameStore((s) => s.selectedBuildingId !== null || s.activeInteractionId !== null);
  const inInterior = useGameStore((s) => s.currentScene !== 'city');
  const transitioning = useGameStore((s) => s.transition.active);
  const returnToCity = useGameStore((s) => s.returnToCity);
  const zoneRef = useRef<HTMLSpanElement>(null);
  const posRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const [locked, setLocked] = useState(isPointerLocked);
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    const onChange = () => setLocked(isPointerLocked());
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (zoneRef.current) zoneRef.current.textContent = telemetry.zoneName;
      if (posRef.current) posRef.current.textContent = `X ${telemetry.x.toFixed(1)} · Z ${telemetry.z.toFixed(1)}`;
      if (fpsRef.current) fpsRef.current.textContent = `${telemetry.fps} FPS`;
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="hud">
      <div className="hud-chip hud-zone">
        <MapPin size={16} aria-hidden />
        <div>
          <span ref={zoneRef} className="hud-zone-name">
            {telemetry.zoneName}
          </span>
          <span className="hud-coords">
            <span ref={posRef} /> · <span ref={fpsRef} />
          </span>
        </div>
      </div>

      {inInterior && !transitioning && (
        <button className="btn hud-exit" onClick={returnToCity}>
          <LogOut size={16} aria-hidden /> Salir a la ciudad
        </button>
      )}

      <SoundToggle />
      <ToastMessage />

      <button className="btn btn--icon hud-pause" onClick={pause} aria-label="Pausar (Esc)" title="Pausar (Esc)">
        <Pause size={18} />
      </button>

      {!panelOpen && <div className="crosshair" aria-hidden />}
      <BuildingTooltip />
      <InteractionPrompt />
      <BuildingInfoPanel />
      <ObjectInfoPanel />

      {!locked && !touch && !panelOpen && (
        <div className="hud-hint">
          <MousePointer2 size={15} aria-hidden /> Haz clic en la ciudad para mirar con el mouse
        </div>
      )}

      <div className={`hud-chip hud-controls${panelOpen ? ' is-hidden' : ''}`}>
        <ControlsList compact />
      </div>

      <VirtualJoystick />
    </div>
  );
}
