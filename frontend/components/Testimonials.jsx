"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

const colors = [
  "from-indigo-500 to-purple-500",
  "from-purple-500 to-pink-500",
  "from-blue-500 to-indigo-500",
];

export default function Testimonials() {
  const { t } = useLanguage();

  const testimonials = [
    {
      quoteKey: "testimonial1Text",
      authorKey: "testimonial1Author",
      roleKey: "testimonial1Role",
    },
    {
      quoteKey: "testimonial2Text",
      authorKey: "testimonial2Author",
      roleKey: "testimonial2Role",
    },
    {
      quoteKey: "testimonial3Text",
      authorKey: "testimonial3Author",
      roleKey: "testimonial3Role",
    },
  ];
  return (
    <section id="testimonials" className="relative py-24 overflow-hidden bg-[#0a0a1a]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25px 25px, rgba(168,85,247,0.3) 1px, transparent 0)",
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
          <span className="inline-block border border-purple-400/40 text-purple-300 text-xs font-semibold px-4 py-1.5 rounded-full tracking-widest uppercase">
            {t('testimonials')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-6 bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
            {t('trustedByTeams')}
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            {t('testimonialsDesc')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="group relative p-8 rounded-xl border border-white/5 bg-[#0f0f2a]/60 backdrop-blur-sm hover:border-purple-500/30 transition-colors"
            >
              <div className="absolute top-4 right-4 text-6xl leading-none text-purple-500/10 select-none">
                &ldquo;
              </div>

              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[i]} flex items-center justify-center text-white font-bold text-lg mb-5`}
              >
                {t(item.authorKey).charAt(0)}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6 relative z-10">
                &ldquo;{t(item.quoteKey)}&rdquo;
              </p>

              <div className="border-t border-white/5 pt-4">
                <p className="text-white font-semibold text-sm">{t(item.authorKey)}</p>
                <p className="text-gray-500 text-xs mt-0.5">{t(item.roleKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
