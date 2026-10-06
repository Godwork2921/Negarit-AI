"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../lib/animations";

/**
 * Reveal — scroll-triggered entrance with reduced-motion support.
 *
 * The single entry point for "animate this in when it becomes visible",
 * so timing and travel distance stay consistent across the product.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.55,
  scale,
  once = true,
  amount = 0.25,
  as = "div",
  className = "",
  ...rest
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] ?? motion.div;

  if (reduced) {
    return (
      <MotionTag className={className} {...rest}>
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y, ...(scale ? { scale } : {}) }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE.out }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/**
 * RevealGroup — parent that staggers its `RevealItem` children.
 * Pair with <RevealGroup> + <RevealItem> for grids and lists.
 */
export function RevealGroup({
  children,
  stagger = 0.08,
  delay = 0,
  className = "",
  as = "div",
  ...rest
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: reduced
            ? { duration: 0 }
            : { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

export const revealItemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.out } },
};

/** Child of RevealGroup. Must be a motion element. */
export function RevealItem({ children, className = "", as = "div", ...rest }) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      variants={reduced ? undefined : revealItemVariants}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/**
 * SectionHeader — eyebrow + heading + lede, already animated.
 * Keeps every section's typographic rhythm identical.
 */
export function SectionHeader({ eyebrow, title, lede, align = "center", className = "" }) {
  const alignment =
    align === "center" ? "mx-auto text-center max-w-2xl" : "max-w-2xl text-left";

  return (
    <div className={`${alignment} ${className}`}>
      <Reveal y={14} duration={0.45}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      </Reveal>
      <Reveal y={22} delay={0.06}>
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
          {title}
        </h2>
      </Reveal>
      {lede ? (
        <Reveal y={18} delay={0.12}>
          <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">{lede}</p>
        </Reveal>
      ) : null}
    </div>
  );
}
