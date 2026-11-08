import { Component, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Si un GLB no carga (404, archivo corrupto), se muestra el modelo procedural en su lugar. */
export class ModelErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[modelos] No se pudo cargar un GLB, usando modelo procedural.', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
