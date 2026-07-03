"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
};

export function Reveal({ children, className, delay = 0, style }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      style={style}
      initial={reduceMotion ? false : { opacity: 0.82, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
