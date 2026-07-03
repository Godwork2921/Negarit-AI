"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const threats = [
  { label: "Phishing URL", color: "#ef4444" },
  { label: "Deepfake AI", color: "#a855f7" },
  { label: "Malware File", color: "#22c55e" },
  { label: "SMS Scam", color: "#eab308" },
];

export default function HeroSection() {
  const { t } = useLanguage();
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#1a0a2e]">
      {/* Animated grid overlay */}
      <div className="absolute inset-0 z-0 opacity-20">
        <motion.div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
          animate={{ backgroundPosition: ["0px 0px", "0px 60px"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <motion.div
          className="grid md:grid-cols-2 gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Left Content */}
          <div className="text-center md:text-left">
            <motion.div variants={slideUp}>
              <span className="inline-block border border-indigo-400/40 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
                {t('enterpriseGradeProtection')}
              </span>
            </motion.div>

            <motion.h1
              variants={slideUp}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mt-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                {t('heroHeading')}
              </span>
            </motion.h1>

            <motion.p
              variants={slideUp}
              className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed"
            >
              {t('heroDescription')}
            </motion.p>

            <motion.div
              variants={slideUp}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4"
            >
              <motion.a
                href="/dashboard"
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(249,115,22,0.4)" }}
                whileTap={{ scale: 0.95 }}
                className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg shadow-lg shadow-orange-500/25 group inline-block"
              >
                <span className="relative z-10">{t('analyzeNow')}</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.a>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                whileTap={{ scale: 0.95 }}
                className="border border-white/20 text-white px-8 py-3.5 rounded-xl font-semibold text-lg backdrop-blur-sm"
              >
                {t('learnMore')}
              </motion.button>
            </motion.div>

            <motion.div variants={slideUp} className="mt-10 flex items-center justify-center md:justify-start gap-4">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-[#0a0a1a] bg-gradient-to-br from-indigo-400 to-purple-500"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                  />
                ))}
              </div>
              <p className="text-gray-400 text-sm">
                {t('trustedBy')} <span className="text-white font-semibold">10,000+</span> {t('securityProfessionals')}
              </p>
            </motion.div>
          </div>

          {/* Right Hero Visual */}
          <motion.div variants={scaleIn} className="relative flex justify-center items-center">
            {/* Orbiting container */}
            <motion.div
              className="relative w-[340px] h-[340px] flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              {threats.map((t, i) => {
                const angle = i * 90;
                const rad = (angle * Math.PI) / 180;
                const radius = 150;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;
                return (
                  <motion.div
                    key={i}
                    className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md"
                    style={{
                      backgroundColor: `${t.color}22`,
                      border: `1px solid ${t.color}55`,
                      color: t.color,
                      left: `calc(50% + ${x}px - 2rem)`,
                      top: `calc(50% + ${y}px - 0.75rem)`,
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 0px ${t.color}00`,
                        `0 0 12px ${t.color}44`,
                        `0 0 0px ${t.color}00`,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    {t.label}
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Center Shield */}
            <motion.div
              className="absolute w-36 h-36 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-2xl"
              style={{ boxShadow: "0 0 60px rgba(99,102,241,0.3)" }}
              animate={{
                scale: [1, 1.04, 1],
                boxShadow: [
                  "0 0 40px rgba(99,102,241,0.3)",
                  "0 0 70px rgba(99,102,241,0.5)",
                  "0 0 40px rgba(99,102,241,0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-14 h-14"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </motion.svg>

              {/* Scanning line */}
              <motion.div
                className="absolute inset-2 rounded-xl overflow-hidden opacity-40"
                style={{ clipPath: "inset(0)" }}
              >
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
