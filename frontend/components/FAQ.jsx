"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

export default function FAQ() {
  const { t } = useLanguage();

  const faqs = [
    { qKey: "faq1Q", aKey: "faq1A" },
    { qKey: "faq2Q", aKey: "faq2A" },
    { qKey: "faq3Q", aKey: "faq3A" },
    { qKey: "faq4Q", aKey: "faq4A" },
    { qKey: "faq5Q", aKey: "faq5A" },
  ];
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="relative py-24 overflow-hidden bg-[#0f0f2a]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block border border-indigo-400/40 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
            {t('navFaq')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-6 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            {t('faqSectionTitle')}
          </h2>
          <p className="mt-4 text-gray-400">
            {t('faqSectionDesc')}
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`rounded-xl border transition-colors ${
                openIndex === i
                  ? "border-indigo-500/30 bg-indigo-500/5"
                  : "border-white/5 bg-[#0a0a1a]/40 hover:border-white/10"
              }`}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-white font-medium pr-4">{t(f.qKey)}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/10 flex items-center justify-center"
                >
                  <svg
                    className="w-3.5 h-3.5 text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" d="M12 4v16M4 12h16" />
                  </svg>
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 text-gray-400 text-sm leading-relaxed">
                      {t(f.aKey)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
