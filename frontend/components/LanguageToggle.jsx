"use client";

import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { SPRING } from "../lib/animations";

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();
  const isEnglish = lang === "en";

  return (
    <motion.button
      onClick={toggleLang}
      whileTap={{ scale: 0.9 }}
      transition={SPRING.snappy}
      aria-label={isEnglish ? "Switch to Amharic" : "Switch to English"}
      title={isEnglish ? "Switch to Amharic" : "Switch to English"}
      className="grid size-9 place-items-center rounded-lg border border-[var(--border)] text-base leading-none transition-colors duration-200 hover:border-[var(--border-accent)] hover:bg-[var(--primary-soft)]"
    >
      <motion.span
        key={lang}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING.bouncy}
        aria-hidden="true"
      >
        {isEnglish ? "🇪🇹" : "🇬🇧"}
      </motion.span>
    </motion.button>
  );
}
