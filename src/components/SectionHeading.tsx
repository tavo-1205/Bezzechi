import type { ReactElement, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/* ---------------------------------------------------------------------------
 * Encabezado reutilizable de sección (eyebrow + título + subtítulo) y wrapper
 * de revelado al hacer scroll. Ambos respeta `prefers-reduced-motion`.
 * ------------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}): ReactElement {
  const center = align === 'center';

  return (
    <div className={center ? 'text-center' : undefined}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className={`mt-3 text-3xl text-mist md:text-5xl${center ? ' mx-auto' : ''}`}>{title}</h2>
      {subtitle ? (
        <p className={`mt-4 max-w-2xl text-base text-ash${center ? ' mx-auto' : ''}`}>{subtitle}</p>
      ) : null}
    </div>
  );
}

/** Bloque que aparece con una animación sutil al entrar en pantalla. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }): ReactElement {
  const reduced = useReducedMotion() ?? false;

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
