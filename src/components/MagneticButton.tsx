/**
 * MagneticButton — botón con atracción magnética al puntero.
 *
 * - Semántica de `<button type="button">` real: reenvía `className`, `onClick`,
 *   `aria-*`, `ref` (forwardRef) y el resto de props de botón; acepta
 *   `children` y `strength` (0 = ninguna, 1 = máxima; defecto 0.35, sutil).
 * - Traslación suave (lerp estilo resorte) con `translate3d` hacia el cursor
 *   mientras el puntero está sobre el botón.
 * - Desactivado por completo con `prefers-reduced-motion: reduce` y con
 *   punteros gruesos `(pointer: coarse)`: no se enlazan handlers de puntero ni
 *   se ejecuta el bucle de animación.
 * - Vuelve al centro al salir del ratón y al recibir foco por teclado; no
 *   rompe la tabulación ni el anillo de foco visible.
 * - Handlers enlazados por React (sin duplicados; se desvinculan solos en el
 *   unmount) y cancel del `requestAnimationFrame` al desmontar o al desactivar.
 */

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactElement } from 'react';
import { useReducedMotion } from 'framer-motion';

interface MagneticButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  children: React.ReactNode;
  className?: string;
  /** Fuerza de atracción (0-1). Defecto: 0.35, sutil. */
  strength?: number;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onPointerMove?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLButtonElement>;
}

const LERP = 0.22; // suavidad del desplazamiento (estilo resorte)
const EPSILON = 0.02; // umbral para dar el bucle de animación por terminado

const MagneticButton = forwardRef<HTMLButtonElement, MagneticButtonProps>(
  (
    {
      children,
      className = '',
      strength = 0.35,
      onClick,
      onFocus,
      onPointerMove,
      onPointerLeave,
      style,
      ...rest
    },
    ref,
  ): ReactElement => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const reduced = useReducedMotion() === true;
    const [coarse] = useState(() =>
      typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    );
    const enabled = !reduced && !coarse;

    const position = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const target = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const frame = useRef(0);
    const active = useRef(false);

    const stop = useCallback((): void => {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
      active.current = false;
    }, []);

    const step = (): void => {
      const el = buttonRef.current;
      if (!el) {
        active.current = false;
        return;
      }
      position.current.x += (target.current.x - position.current.x) * LERP;
      position.current.y += (target.current.y - position.current.y) * LERP;
      el.style.transform = `translate3d(${position.current.x.toFixed(2)}px, ${position.current.y.toFixed(2)}px, 0)`;
      const done =
        Math.abs(target.current.x - position.current.x) < EPSILON &&
        Math.abs(target.current.y - position.current.y) < EPSILON;
      if (done) {
        active.current = false;
      } else {
        frame.current = requestAnimationFrame(step);
      }
    };

    const start = useCallback((): void => {
      if (!active.current) {
        active.current = true;
        frame.current = requestAnimationFrame(step);
      }
    }, []);

    const pull = useCallback(
      (event: PointerEvent<HTMLButtonElement>): void => {
        if (!enabled) return;
        const el = buttonRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const s = Math.min(Math.max(Number(strength), 0), 1);
        target.current.x = (event.clientX - (rect.left + rect.width / 2)) * s;
        target.current.y = (event.clientY - (rect.top + rect.height / 2)) * s;
        start();
      },
      [enabled, strength, start],
    );

    const returnHome = useCallback((): void => {
      target.current.x = 0;
      target.current.y = 0;
      start();
    }, [start]);

    // Al desactivarse (reduced-motion / puntero grueso) se detiene todo y se
    // devuelve el botón a su lugar inmediatamente.
    useEffect(() => {
      if (!enabled) {
        stop();
        target.current = { x: 0, y: 0 };
        position.current = { x: 0, y: 0 };
        const el = buttonRef.current;
        if (el) el.style.transform = 'none';
      }
    }, [enabled, stop]);

    // Cancela la animación pendiente en el unmount.
    useEffect(() => () => stop(), [stop]);

    const attachRef = useCallback(
      (node: HTMLButtonElement | null): void => {
        buttonRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as { current: HTMLButtonElement | null }).current = node;
        }
      },
      [ref],
    );

    return (
      <button
        ref={attachRef}
        type="button"
        onClick={onClick}
        onFocus={(event): void => {
          returnHome();
          onFocus?.(event);
        }}
        onPointerMove={(event): void => {
          pull(event);
          onPointerMove?.(event);
        }}
        onPointerLeave={(event): void => {
          returnHome();
          onPointerLeave?.(event);
        }}
        className={className}
        style={{
          ...style,
          transform: `translate3d(${position.current.x.toFixed(2)}px, ${position.current.y.toFixed(2)}px, 0)`,
          willChange: enabled ? 'transform' : undefined,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

MagneticButton.displayName = 'MagneticButton';

export default MagneticButton;
