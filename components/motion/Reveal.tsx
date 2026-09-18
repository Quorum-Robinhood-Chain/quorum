'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// Simple fade + slide-up wrapper, used to bring homepage sections in as the
// user scrolls. Server components (Hero, MarketsSection, ...) render fine as
// children here — only this wrapper needs to be a client component.
export default function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
