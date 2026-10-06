"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { SPRING, EASE } from "../lib/animations";
import AmbientBackdrop from "./AmbientBackdrop";

const THREATS = [
  { label: "Phishing URL", color: "var(--danger)" },
  { label: "Deepfake AI", color: "var(--accent)" },
  { label: "Malware File", color: "var(--success)" },
  { label: "SMS Scam", color: "var(--warning)" },
];

const STATS = [
  { value: "10K+", label: "analyses run monthly" },
  { value: "<400ms", label: "median response" },
  { value: "6", label: "detection engines" },
];

export default function HeroSection() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);

  // Scroll-linked parallax: content drifts up slightly as the hero exits.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const artY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const smoothY = useSpring(contentY, { stiffness: 120, damping: 28 });
  const smoothOpacity = useSpring(contentOpacity, { stiffness: 120, damping: 30 });

  /** Returns the keyframes, or nothing at all when motion is reduced. */
  const loop = (keyframes) => (reduced ? undefined : keyframes);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-20 pt-32 md:pb-28 md:pt-36"
    >
      <AmbientBackdrop grid="lines" orbs={3} />

      <div className="container-page grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* ── Copy ── */}
        <motion.div
          style={reduced ? undefined : { y: smoothY, opacity: smoothOpacity }}
          className="text-center lg:text-left"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
          >
            <span className="eyebrow">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              {t("enterpriseGradeProtection")}
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: EASE.out }}
            className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
          >
            <span className="text-gradient">{t("heroHeading")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: EASE.out }}
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0"
          >
            {t("heroDescription")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: EASE.out }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <MagneticLink href="/dashboard" className="btn-primary px-7 py-3.5 text-base">
              {t("analyzeNow")}
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </MagneticLink>

            <a href="#features" className="btn-secondary px-7 py-3.5 text-base">
              {t("learnMore")}
            </a>
          </motion.div>

          {/* Trust strip */}
          <motion.dl
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38, ease: EASE.out }}
            className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-[var(--border)] pt-7 lg:mx-0"
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-2xl font-bold tracking-tight text-ink">{s.value}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-subtle">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* ── Visual ── */}
        <motion.div
          style={reduced ? undefined : { y: artY }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.24, ease: EASE.out }}
          className="relative mx-auto aspect-square w-full max-w-[30rem] lg:max-w-none"
        >
          <ShieldCore />
          <OrbitThreats />
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute inset-x-0 bottom-7 hidden justify-center lg:flex"
      >
        <motion.span
          animate={loop({ y: [0, 7, 0] })}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="grid size-9 place-items-center rounded-full border border-[var(--border)] text-subtle"
        >
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14m-7-7 7 7 7-7" />
          </svg>
        </motion.span>
      </motion.div>
    </section>
  );
}

/* ── Orbiting threat nodes ──────────────────────────────────────────── */
function OrbitThreats() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
      {/* Dashed outer track */}
      <div className="absolute size-full rounded-full border border-dashed border-[var(--border-strong)]" />

      {/* Rotating ring */}
      <motion.div
        className="absolute size-[76%] rounded-full"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {THREATS.map((threat, i) => {
          const angle = (i * 90 - 45) * (Math.PI / 180);
          const x = Math.cos(angle) * 50;
          const y = Math.sin(angle) * 50;

          return (
            <div
              key={threat.label}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${x}%, ${y}%)` }}
            >
              {/* Counter-rotate so the label never spins with the ring */}
              <motion.div
                animate={reduced ? undefined : { rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              >
                <motion.div
                  className="relative flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-md)] backdrop-blur-md"
                  style={{
                    color: threat.color,
                    borderColor: `color-mix(in oklab, ${threat.color} 45%, transparent)`,
                    backgroundColor: `color-mix(in oklab, ${threat.color} 14%, var(--surface))`,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: threat.color }}
                  />
                  {threat.label}
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{ boxShadow: `0 0 18px ${threat.color}` }}
                    animate={reduced ? undefined : { opacity: [0, 0.45, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                  />
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ── Central shield ─────────────────────────────────────────────────── */
function ShieldCore() {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 grid place-items-center">
      {/* Signal rings */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute rounded-full border border-[var(--primary)]/30"
          style={{ width: "46%", height: "46%" }}
          animate={reduced ? undefined : { scale: [1, 1.75], opacity: [0.55, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeOut", delay: i * 1.2 }}
        />
      ))}

      {/* Core plate */}
      <motion.div
        className="relative grid aspect-square w-[46%] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-brand-gradient shadow-[var(--shadow-brand)]"
        animate={reduced ? undefined : { scale: [1, 1.035, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          className="size-1/2 text-[var(--text-inverse)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>

        {/* Sweep */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"
          animate={reduced ? undefined : { top: ["6%", "94%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}

/* ── Magnetic link ──────────────────────────────────────────────────── */
function MagneticLink({ href, children, className }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const x = useSpring(0, { stiffness: 260, damping: 18 });
  const y = useSpring(0, { stiffness: 260, damping: 18 });

  const onMove = (e) => {
    if (reduced) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.16);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.24);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={reduced ? undefined : { x, y }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={SPRING.snappy}
      className={className}
    >
      {children}
    </motion.a>
  );
}
