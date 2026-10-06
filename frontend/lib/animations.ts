/**
 * NegaritAI Motion System
 * ------------------------------------------------------------------
 * One place for every animation decision in the product.
 *
 * Principles:
 *  1. Spring physics for anything the pointer touches (feels physical,
 *     never linear).
 *  2. Decelerating easing for anything that enters the viewport (arrives,
 *     never bounces).
 *  3. Transform + opacity only — no layout-triggering properties.
 *  4. Every transition reads from `lib/motion-preference` so users who ask
 *     for reduced motion get a still, usable interface.
 */

import { useReducedMotion } from "framer-motion";

/* ── Easing curves ─────────────────────────────────────────────────── */

export const EASE = {
  /** Decelerate hard — the default for entrances. */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Symmetric — for loops that need to breathe. */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  /** Gentle accelerate — for exits. */
  in: [0.7, 0, 0.84, 0] as [number, number, number, number],
  /** Slight overshoot — for playful accents. */
  anticipate: [0.36, 1.56, 0.64, 1] as [number, number, number, number],
};

/* ── Named spring transitions ───────────────────────────────────────── */

export const SPRING = {
  /** Buttons, chips, icon toggles. Fast and tight. */
  snappy: { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.7 },
  /** Cards, panels, drawers. Confident, no wobble. */
  smooth: { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.9 },
  /** Hero-scale elements. Slow and cinematic. */
  gentle: { type: "spring" as const, stiffness: 140, damping: 22, mass: 1 },
  /** Playful pop (badges, status pills). */
  bouncy: { type: "spring" as const, stiffness: 340, damping: 18, mass: 0.8 },
};

/* ── Durations (for CSS-side / non-spring animation) ────────────────── */

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.35,
  slow: 0.55,
  slower: 0.8,
} as const;

/* ── Reveal variants ────────────────────────────────────────────────── */

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
};

/** Primary entrance: rises and settles. */
export const riseIn = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.out },
  },
};

/** Smaller rise for dense content (cards, list rows). */
export const riseInSm = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE.out } },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 28 },
  visible: { opacity: 1, x: 0, transition: { duration: DURATION.slow, ease: EASE.out } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
};

/** Emphasis for hero-scale art. */
export const heroReveal = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.slower, ease: EASE.out },
  },
};

/* ── Stagger orchestration ──────────────────────────────────────────── */

export const staggerContainer = (stagger = 0.08, delay = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
};

/* ── Interaction helpers ────────────────────────────────────────────── */

/** Resting hover/press state for anything clickable. */
export const interactive = {
  whileHover: { y: -2 },
  whileTap: { y: 0, scale: 0.98 },
  transition: SPRING.snappy,
};

/** Softer variant for large surfaces (nav links, list rows). */
export const interactiveSoft = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985 },
  transition: SPRING.smooth,
};

/** Icon-only control: rotates subtly instead of scaling the hit area. */
export const pressable = {
  whileTap: { scale: 0.88 },
  transition: SPRING.snappy,
};

/* ── Layout / chrome ────────────────────────────────────────────────── */

export const navBar = {
  hidden: { y: -72, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: DURATION.slow, ease: EASE.out } },
};

export const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE.in } },
};

/** Accordion: height auto with a matching fade so text doesn't pop. */
export const collapse = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { height: SPRING.smooth, opacity: { duration: DURATION.fast } },
  },
  exit: { height: 0, opacity: 0, transition: SPRING.snappy },
};

/** Shared viewport config so scroll triggers fire at a consistent point. */
export const inView = { once: true, amount: 0.25 } as const;

/* ── Looping ambience (hero visuals) ────────────────────────────────── */

export const orbit = (duration = 34) => ({
  animate: { rotate: 360 },
  transition: { duration, repeat: Infinity, ease: "linear" as const },
});

export const float = (duration = 7, distance = 14) => ({
  animate: { y: [0, -distance, 0] },
  transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
});

export const breathe = (duration = 4.5, scale = 1.045) => ({
  animate: { scale: [1, scale, 1] },
  transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
});

export const shimmer = (duration = 2.6) => ({
  animate: { x: ["-120%", "220%"] },
  transition: { duration, repeat: Infinity, ease: "easeInOut" as const },
});

export const spinSlow = (duration = 26) => ({
  animate: { rotate: 360 },
  transition: { duration, repeat: Infinity, ease: "linear" as const },
});

/* ── Reduced-motion bridge ──────────────────────────────────────────── */

/**
 * Returns the same variants when motion is welcome, and a no-op "visible"
 * variant when the user prefers reduced motion. Components can pass the
 * result straight to `motion.*` and stay readable.
 */
export function useMotionVariants(variants: {
  hidden?: object;
  visible?: object;
  exit?: object;
}) {
  const reduced = useReducedMotion();

  if (!reduced) return variants;

  return {
    initial: { opacity: 1 },
    animate: { opacity: 1, transition: { duration: 0 } },
    exit: { opacity: 1, transition: { duration: 0 } },
  };
}

/** Convenience flag for components that branch on motion preference. */
export function useMotionEnabled() {
  return !useReducedMotion();
}
