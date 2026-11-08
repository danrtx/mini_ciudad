import { CONTROLS } from '../../data/controls';

export function ControlsList({ compact = false }: { compact?: boolean }) {
  const items = compact ? CONTROLS.filter((c) => c.available) : CONTROLS;
  return (
    <ul className={`controls-list${compact ? ' controls-list--compact' : ''}`}>
      {items.map((c) => (
        <li key={c.action} className={c.available ? '' : 'is-upcoming'}>
          <span className="keys">
            {c.keys.map((k) => (
              <kbd key={k}>{k}</kbd>
            ))}
          </span>
          <span>{c.action}</span>
        </li>
      ))}
    </ul>
  );
}
