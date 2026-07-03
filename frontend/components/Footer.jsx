"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  const sections = [
    { sectionKey: "product", items: ["navFeatures", "navHowItWorks", "testimonials", "navFaq"] },
    { sectionKey: "resources", items: ["documentation", "apiReference", "securityReports", "blog"] },
    { sectionKey: "company", items: ["aboutUs", "careers", "contact", "privacyPolicy"] },
  ];

  const socials = [
    { labelKey: "email", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    { labelKey: "github", icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" },
    { labelKey: "twitter", icon: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" },
    { labelKey: "linkedin", icon: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z" },
  ];
  return (
    <footer className="relative bg-[#0a0a1a] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
              {t('negaritAi')}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              {t('footerDescription')}
            </p>
          </div>

          {sections.map((sec, idx) => (
            <div key={idx}>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {t(sec.sectionKey)}
              </h4>
              <ul className="space-y-3">
                {sec.items.map((itemKey, i) => (
                  <motion.li
                    key={i}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                      {t(itemKey)}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social + Status */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {socials.map((s, i) => (
              <motion.a
                key={i}
                href="#"
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-indigo-500/20 group transition-colors"
                aria-label={t(s.labelKey)}
              >
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path d={s.icon} />
                </svg>
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <motion.span
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-green-400 text-sm">{t('allSystemsOperational')}</span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-xs">
            {t('copyrightFooter')}
          </p>
        </div>
      </div>
    </footer>
  );
}
