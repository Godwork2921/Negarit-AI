"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * AmbientBackdrop — the decorative layer that sits behind page content.
 *
 * Centralised so every section shares the same depth cues instead of each
 * one inventing its own grid, blobs and opacity. Purely decorative: it is
 * hidden from assistive tech and ignores pointer events.
 *
 * @param grid      "lines" | "dots" | "none"
 * @param orbs      how many soft light sources to place
 * @param animated  drift the orbs slowly (auto-disabled for reduced motion)
 */
export default function AmbientBackdrop({
  grid = "lines",
  orbs = 2,
  animated = true,
  position = "absolute",
  className = "",
}) {
  const reduced = useReducedMotion();
  const shouldAnimate = animated && !reduced;
  const inset = position === "fixed" ? "fixed inset-0" : "absolute inset-0";

  const orbsConfig = [
    { size: "size-[26rem]", pos: "top-[6%] -left-24", opacity: 0.55, delay: 0 },
    { size: "size-[22rem]", pos: "bottom-[8%] -right-28", opacity: 0.4, delay: 1.6 },
    { size: "size-[18rem]", pos: "top-1/2 left-1/3", opacity: 0.22, delay: 3.2 },
  ].slice(0, orbs);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${inset} overflow-hidden ${className}`}
    >
      {grid === "lines" ? (
        <div className="absolute inset-0 surface-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      ) : null}

      {grid === "dots" ? (
        <div className="absolute inset-0 surface-dots [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      ) : null}

      {orbsConfig.map((orb, i) => (
        <motion.div
          key={i}
          className={`glow-orb ${orb.size} ${orb.pos}`}
          style={{ opacity: orb.opacity }}
          animate={shouldAnimate ? { y: [0, i % 2 === 0 ? -26 : 26, 0] } : undefined}
          transition={{
            duration: 13 + i * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
