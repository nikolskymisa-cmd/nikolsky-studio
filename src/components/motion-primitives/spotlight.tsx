"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Adapted from Motion Primitives (MIT): github.com/ibelick/motion-primitives.
type SpotlightProps = {
  className?: string;
  size?: number;
};

export function Spotlight({ className, size = 380 }: SpotlightProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const [parent, setParent] = useState<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 24, mass: 0.35 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 24, mass: 0.35 });
  const left = useTransform(x, (value) => `${value - size / 2}px`);
  const top = useTransform(y, (value) => `${value - size / 2}px`);

  useEffect(() => {
    setParent(ref.current?.parentElement ?? null);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(query.matches && !reduceMotion);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [reduceMotion]);

  useEffect(() => {
    if (!parent || !enabled) return;

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = parent.getBoundingClientRect();
      x.set(event.clientX - rect.left);
      y.set(event.clientY - rect.top);
    };
    const enter = () => setActive(true);
    const leave = () => setActive(false);

    parent.addEventListener("pointermove", move);
    parent.addEventListener("pointerenter", enter);
    parent.addEventListener("pointerleave", leave);
    return () => {
      parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerenter", enter);
      parent.removeEventListener("pointerleave", leave);
    };
  }, [enabled, parent, x, y]);

  return (
    <motion.span
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute z-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,183,255,0.18),rgba(0,183,255,0.05)_34%,transparent_70%)] blur-2xl transition-opacity duration-300 ${active ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
      style={{ width: size, height: size, left, top }}
    />
  );
}
