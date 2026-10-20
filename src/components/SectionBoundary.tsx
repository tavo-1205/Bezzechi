import { Component, type ErrorInfo, type ReactElement, type ReactNode } from 'react';

/**
 * Error boundary por sección: si el contenido de una sección revienta en runtime,
 * en lugar de dejar un hueco sin explicación (o tumbar el resto de la página) se
 * muestra un aviso discreto y el contenido crudo cuando esté disponible.
 *
 * Complementa la estrategia «el contenido es visible por defecto»: ni una excepción
 * ni un motor de animación ausente pueden dejar una sección vacía.
 */

interface Props {
  /** Nombre legible para el aviso (p. ej. «Trayectoria»). */
  name: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export default class SectionBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Traza en consola: no se silencia el fallo, solo se evita el hueco blanco.
    console.error(`[SectionBoundary:${this.props.name}]`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <section className="section" aria-label={`${this.props.name} (contenido no disponible)`}>
          <div className="container-x">
            <div className="glass rounded-2xl border border-line p-6">
              <p className="font-cond text-sm tracking-[0.18em] text-ash uppercase">
                {this.props.name}
              </p>
              <p className="mt-2 text-sm text-mist">
                Esta sección no se ha podido mostrar completa ahora mismo. El resto de la página
                sigue disponible.
              </p>
            </div>
          </div>
        </section>
      );
    }
    return this.props.children as ReactElement;
  }
}
