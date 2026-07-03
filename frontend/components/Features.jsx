"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Features() {
  const { t } = useLanguage();

  const features = [
    {
      titleKey: "aiMessageAnalysisTitle",
      descKey: "aiMessageAnalysisDesc",
      icon: (
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      ),
    },
    {
      titleKey: "imageDeepfakeDetectionTitle",
      descKey: "imageDeepfakeDetectionDesc",
      icon: (
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      ),
    },
    {
      titleKey: "urlScannerTitle",
      descKey: "urlScannerDesc",
      icon: (
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      ),
    },
    {
      titleKey: "platformSupportTitle",
      descKey: "platformSupportDesc",
      icon: (
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      ),
    },
    {
      titleKey: "realtimeAlertsTitle",
      descKey: "realtimeAlertsDesc",
      icon: (
        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      ),
    },
    {
      titleKey: "enterpriseReportsTitle",
      descKey: "enterpriseReportsDesc",
      icon: (
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
    },
  ];

  return (
    <section id="features" className="relative py-24 overflow-hidden bg-[#0a0a1a]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25px 25px, rgba(99,102,241,0.3) 1px, transparent 0)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block border border-indigo-400/40 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
            {t('navFeatures')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-6 bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            {t('everythingToStaySafe')}
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            {t('sixEnginesWorking')}
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group relative p-6 rounded-xl border border-white/5 bg-[#0f0f2a]/60 backdrop-blur-sm hover:border-indigo-500/30 transition-colors"
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  <svg
                    className="w-5 h-5 text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    {f.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t(f.titleKey)}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{t(f.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
