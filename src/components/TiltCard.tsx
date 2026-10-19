/**
 * TiltCard — tarjeta con efecto tilt 3D bajo el puntero.
 *
 * - framer-motion: `useMotionValue` + `useSpring` → rotateX/rotateY con
 *   `transformPerspective`, más un destello radial que sigue al ratón.
 * - Desactivado con `prefers-reduced-motion` y en punteros táctiles
 *   (`pointer: coarse` / `pointerType === 'touch'`).
 * - El foco de teclado reinicia la inclinación: el tabulado nunca se rompe.
 * - `label` es un texto corto visible (categoría) renderizado como `.eyebrow`.
 */
import { useState } from 'react';
import type { PointerEvent, ReactElement, ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

const SPRING = { stiffness: 250, damping: 24, mass: 0.6 } as const;
const GLOW_SIZE = 260;
const MAX_INTENSITY = 24;
const DEFAULT_INTENSITY = 10;

export function TiltCard({
  children,
  className,
  intensity = DEFAULT_INTENSITY,
  label,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  label?: string;
}): ReactElement {
  const reduced = useReducedMotion() === true;
  const [coarse] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  );
  const [hovered, setHovered] = useState(false);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const smoothRotateX = useSpring(rotateX, SPRING);
  const smoothRotateY = useSpring(rotateY, SPRING);
  const smoothGlowX = useSpring(glowX, SPRING);
  const smoothGlowY = useSpring(glowY, SPRING);

  const amplitude = Number.isFinite(intensity)
    ? Math.min(Math.max(intensity, 0), MAX_INTENSITY)
    : DEFAULT_INTENSITY;
  const enabled = !reduced && !coarse;

  const resetTilt = (): void => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!enabled || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    rotateX.set((0.5 - py) * 2 * amplitude);
    rotateY.set((px - 0.5) * 2 * amplitude);
    glowX.set(event.clientX - rect.left - GLOW_SIZE / 2);
    glowY.set(event.clientY - rect.top - GLOW_SIZE / 2);
  };

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>): void => {
    if (!enabled || event.pointerType === 'touch') return;
    setHovered(true);
    handlePointerMove(event);
  };

  const handlePointerLeave = (): void => {
    setHovered(false);
    resetTilt();
  };

  const glowVisible = hovered && enabled;

  return (
    <motion.div
      className={`glass glow-border relative overflow-hidden rounded-2xl ${className ?? ''}`}
      style={{
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
      }}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onFocus={resetTilt}
    >
      {/* Brillo que sigue al puntero (solo puntero fino + movimiento normal) */}
      <motion.span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-0 rounded-full transition-opacity duration-500 ${
          glowVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          marginLeft: -GLOW_SIZE / 2,
          marginTop: -GLOW_SIZE / 2,
          x: smoothGlowX,
          y: smoothGlowY,
          background:
            'radial-gradient(circle closest-side, rgba(255,138,61,0.30), rgba(255,77,0,0.10) 55%, transparent 78%)',
        }}
      />

      {label !== undefined && label !== '' ? (
        <span className="eyebrow relative z-10 block">{label}</span>
      ) : null}
      <div className={label !== undefined && label !== '' ? 'relative z-10 mt-3' : 'relative z-10'}>
        {children}
      </div>
    </motion.div>
  );
}
