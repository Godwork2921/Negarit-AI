"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <motion.button
      onClick={toggleLang}
      whileTap={{ scale: 0.9 }}
      className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
      title={lang === "en" ? "Switch to Amharic" : "Switch to English"}
    >
      <span className="text-base leading-none">
        {lang === "en" ? "🇪🇹" : "🇬🇧"}
      </span>
    </motion.button>
  );
}
