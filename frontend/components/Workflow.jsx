"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

export default function Workflow() {
  const { t } = useLanguage();

  const steps = [
    {
      num: "01",
      titleKey: "submitContentStep",
      descKey: "submitContentStepDesc",
    },
    {
      num: "02",
      titleKey: "aiAnalysisStep",
      descKey: "aiAnalysisStepDesc",
    },
    {
      num: "03",
      titleKey: "getResultsStep",
      descKey: "getResultsStepDesc",
    },
  ];

  return (
    <section id="workflow" className="relative py-24 overflow-hidden bg-[#0f0f2a]">
      <div className="absolute top-1/3 left-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block border border-purple-400/40 text-purple-300 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
            {t('navHowItWorks')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-6 bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
            {t('securityInThreeSteps')}
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            {t('workflowDesc')}
          </p>
        </motion.div>

        {/* Connector line */}
        <div className="hidden lg:block absolute top-[13rem] left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-indigo-500/20 via-purple-500/40 to-indigo-500/20" />

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.25, duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
              className="relative text-center group"
            >
              <motion.div
                className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-indigo-600/20 mb-6 group-hover:shadow-indigo-600/40 transition-shadow"
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
              >
                {s.num}
              </motion.div>

              <h3 className="text-xl font-semibold text-white mb-3">{t(s.titleKey)}</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">{t(s.descKey)}</p>

              {i < steps.length - 1 && (
                <motion.div
                  className="hidden lg:block absolute top-8 -right-6 text-indigo-400/40"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
