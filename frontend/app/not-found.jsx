"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "../contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center px-6"
      >
        <motion.div
          className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center"
          animate={{ rotate: [0, -3, 3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl md:text-8xl font-extrabold bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent mb-4"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl md:text-2xl text-gray-300 mb-6"
        >
          {t('pageNotFound')}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 max-w-md mx-auto mb-10"
        >
          {t('pageNotFoundDesc')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-shadow"
          >
            {t('goBack')}
          </motion.button>
          <Link
            href="/"
            className="border border-white/20 text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/5 transition-colors text-center"
          >
            {t('backToHome')}
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 text-gray-600 text-sm"
        >
          <span className="text-indigo-400">{t('negaritAi')}</span> {t('protectingDigitalTrust')}
        </motion.p>
      </motion.div>
    </div>
  );
}
