import { ArrowUp, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { input } from '../../systems/movement/input';

const RADIUS = 46;

/**
 * Controles táctiles: joystick (mover) + botones de saltar y correr.
 * Solo aparece en dispositivos con puntero "grueso" (pantallas táctiles).
 * Escribe en el mismo objeto `input` que el teclado, así el personaje no cambia.
 */
export function VirtualJoystick() {
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  useEffect(
    () => () => {
      input.joystick.x = 0;
      input.joystick.y = 0;
      input.jump = false;
      input.run = false;
    },
    [],
  );

  if (!touch) return null;

  const update = (e: ReactPointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    input.joystick.x = dx / RADIUS;
    input.joystick.y = -dy / RADIUS;
    input.run = len > RADIUS * 1.15;
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const end = () => {
    activeId.current = null;
    input.joystick.x = 0;
    input.joystick.y = 0;
    input.run = false;
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div className="touch-controls">
      <div
        ref={baseRef}
        className="joystick"
        onPointerDown={(e) => {
          activeId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e);
        }}
        onPointerMove={(e) => activeId.current === e.pointerId && update(e)}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Joystick de movimiento"
      >
        <div ref={knobRef} className="joystick-knob" />
      </div>
      <div className="touch-buttons">
        <button
          className="btn btn--icon touch-btn"
          aria-label="Correr"
          onPointerDown={() => (input.run = true)}
          onPointerUp={() => (input.run = false)}
          onPointerCancel={() => (input.run = false)}
        >
          <Zap size={20} />
        </button>
        <button
          className="btn btn--icon touch-btn touch-btn--jump"
          aria-label="Saltar"
          onPointerDown={() => (input.jump = true)}
          onPointerUp={() => (input.jump = false)}
          onPointerCancel={() => (input.jump = false)}
        >
          <ArrowUp size={22} />
        </button>
      </div>
    </div>
  );
}
