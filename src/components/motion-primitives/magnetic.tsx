"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

// Adapted from Motion Primitives (MIT): github.com/ibelick/motion-primitives.
const spring = { stiffness: 230, damping: 20, mass: 0.34 };

type MagneticProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
  range?: number;
};

export function Magnetic({ children, className, intensity = 0.1, range = 140 }: MagneticProps) {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, spring);
  const springY = useSpring(y, spring);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(query.matches && !reduceMotion);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reduceMotion]);

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  if (!enabled) return <>{children}</>;

  return (
    <motion.span
      className={className}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        const distanceX = event.clientX - (rect.left + rect.width / 2);
        const distanceY = event.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(distanceX, distanceY);
        const force = Math.max(0, 1 - distance / range) * intensity;
        x.set(distanceX * force);
        y.set(distanceY * force);
      }}
      onPointerLeave={reset}
    >
      {children}
    </motion.span>
  );
}
