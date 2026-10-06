"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import AmbientBackdrop from "../components/AmbientBackdrop";
import { EASE, SPRING } from "../lib/animations";
import { useLanguage } from "../contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <AmbientBackdrop grid="lines" orbs={2} />

      <motion.div
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE.out }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <motion.span
          className="mx-auto grid size-24 place-items-center rounded-3xl bg-brand-gradient shadow-[var(--shadow-brand)]"
          animate={reduced ? undefined : { rotate: [0, -3, 3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            className="size-12 text-[var(--text-inverse)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </motion.span>

        <motion.h1
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: EASE.out }}
          className="mt-8 text-7xl font-extrabold tracking-tighter text-ink md:text-8xl"
        >
          404
        </motion.h1>

        <motion.p
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: EASE.out }}
          className="mt-3 text-xl font-bold text-ink md:text-2xl"
        >
          {t("pageNotFound")}
        </motion.p>

        <motion.p
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.5, ease: EASE.out }}
          className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted"
        >
          {t("pageNotFoundDesc")}
        </motion.p>

        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING.smooth}
          className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn-primary px-7 py-3 text-sm"
          >
            {t("goBack")}
          </button>
          <Link href="/" className="btn-secondary px-7 py-3 text-sm">
            {t("backToHome")}
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-xs text-subtle"
        >
          <span className="font-bold text-primary">{t("negaritAi")}</span>{" "}
          {t("protectingDigitalTrust")}
        </motion.p>
      </motion.div>
    </div>
  );
}
