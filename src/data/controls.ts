/** Controles mostrados en la UI. `available` indica si ya están activos. */
export const CONTROLS: { keys: string[]; action: string; available: boolean }[] = [
  { keys: ['W', 'A', 'S', 'D'], action: 'Caminar', available: true },
  { keys: ['Shift'], action: 'Correr', available: true },
  { keys: ['Espacio'], action: 'Saltar', available: true },
  { keys: ['Mouse'], action: 'Mirar (clic para capturar)', available: true },
  { keys: ['Rueda'], action: 'Acercar / alejar cámara', available: true },
  { keys: ['Esc'], action: 'Pausa', available: true },
  { keys: ['E'], action: 'Interactuar / entrar / salir', available: true },
  { keys: ['Clic'], action: 'Seleccionar edificio u objeto', available: true },
];
