"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { EASE, SPRING } from "../../lib/animations";
import { useLanguage } from "../../contexts/LanguageContext";

const THREAT_ICONS = {
  phishing: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  smishing:
    "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3",
  deepfakes:
    "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z",
  url:
    "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  social:
    "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  vishing:
    "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z",
};

function SectionHeading({ children, className = "" }) {
  return (
    <h2 className={`text-xl font-extrabold tracking-tight text-ink ${className}`}>
      {children}
    </h2>
  );
}

export default function HelpPage() {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: t(`faq${n}Q`),
    a: t(`faq${n}A`),
  }));

  const tips = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    title: t(`tip${n}Title`),
    desc: t(`tip${n}Desc`),
  }));

  const threatTypes = [
    { name: t("phishing"), desc: t("phishingDesc"), icon: THREAT_ICONS.phishing },
    { name: t("smishing"), desc: t("smishingDesc"), icon: THREAT_ICONS.smishing },
    { name: t("deepfakes"), desc: t("deepfakesDesc"), icon: THREAT_ICONS.deepfakes },
    { name: t("urlSpoofing"), desc: t("urlSpoofingDesc"), icon: THREAT_ICONS.url },
    {
      name: t("socialEngineering"),
      desc: t("socialEngineeringDesc"),
      icon: THREAT_ICONS.social,
    },
    { name: t("vishing"), desc: t("vishingDesc"), icon: THREAT_ICONS.vishing },
  ];

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop />

      <main className="relative z-10 mx-auto max-w-6xl space-y-12 px-6 pb-20 pt-20 lg:ml-64 lg:pt-12">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {t("help")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("helpDesc")}</p>
        </motion.header>

        {/* Threat types */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: EASE.out }}
        >
          <SectionHeading className="mb-5">{t("understandingCyberThreats")}</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {threatTypes.map((threat) => (
              <div key={threat.name} className="card p-5">
                <span className="mb-4 grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d={threat.icon} />
                  </svg>
                </span>
                <h3 className="text-sm font-bold text-ink">{threat.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{threat.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Tips */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE.out }}
        >
          <SectionHeading className="mb-5">{t("securityAwarenessTips")}</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            {tips.map((tip, i) => (
              <div key={tip.title} className="card flex items-start gap-3.5 p-5">
                <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary text-sm font-extrabold tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink">{tip.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE.out }}
        >
          <SectionHeading className="mb-5">{t("faqSection")}</SectionHeading>
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-ink">{faq.q}</span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={SPRING.snappy}
                      className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-subtle"
                      aria-hidden="true"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE.out }}
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{faq.a}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Contact */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE.out }}
          className="card p-8 text-center"
        >
          <h2 className="text-lg font-bold text-ink">{t("needMoreHelp")}</h2>
          <p className="mt-2 text-sm text-muted">{t("contactDescription")}</p>
          <a href="mailto:support@negarit-ai.com" className="btn-primary mt-6 px-5 py-2.5 text-sm">
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            {t("contactSupport")}
          </a>
        </motion.section>
      </main>
    </div>
  );
}