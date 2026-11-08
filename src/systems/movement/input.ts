/**
 * Estado de entrada compartido (teclado, mouse y controles táctiles).
 * Es un objeto mutable fuera de React: los sistemas lo leen en cada paso de física sin re-renders.
 * El joystick virtual escribe en `joystick`, así el personaje no distingue el origen de la entrada.
 */
export const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
  jump: false,
  interact: false,
  /** Joystick analógico (−1..1). x = derecha, y = adelante. */
  joystick: { x: 0, y: 0 },
};

const KEY_MAP: Record<string, keyof Omit<typeof input, 'joystick'>> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
  KeyE: 'interact',
};

/** Ejes de movimiento combinados (teclado + joystick), limitados a longitud 1. */
export function readMoveAxes(): { x: number; y: number } {
  let x = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.joystick.x;
  let y = (input.forward ? 1 : 0) - (input.back ? 1 : 0) + input.joystick.y;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

export function resetInput() {
  for (const key of Object.values(KEY_MAP)) input[key] = false;
  input.joystick.x = 0;
  input.joystick.y = 0;
}

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/** Registra los listeners de teclado. Devuelve la función de limpieza. */
export function bindKeyboard(): () => void {
  const onDown = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (!action || isTyping(e.target)) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    input[action] = true;
  };
  const onUp = (e: KeyboardEvent) => {
    const action = KEY_MAP[e.code];
    if (action) input[action] = false;
  };
  // Al perder el foco se sueltan todas las teclas (evita que el personaje siga caminando)
  const onBlur = () => resetInput();
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', onBlur);
  };
}
