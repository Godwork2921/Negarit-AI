"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";

const SECTIONS = [
  {
    sectionKey: "product",
    items: [
      { key: "navFeatures", href: "/#features" },
      { key: "navHowItWorks", href: "/#workflow" },
      { key: "testimonials", href: "/#testimonials" },
      { key: "navFaq", href: "/#faq" },
    ],
  },
  {
    sectionKey: "resources",
    items: [
      { key: "documentation", href: "/help" },
      { key: "apiReference", href: "/help" },
      { key: "securityReports", href: "/threat-history" },
      { key: "blog", href: "/library" },
    ],
  },
  {
    sectionKey: "company",
    items: [
      { key: "aboutUs", href: "/" },
      { key: "careers", href: "/" },
      { key: "contact", href: "/help" },
      { key: "privacyPolicy", href: "/settings" },
    ],
  },
];

const SOCIALS = [
  {
    labelKey: "email",
    href: "mailto:hello@negarit-ai.com",
    path: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    labelKey: "github",
    href: "https://github.com/negarit-ai",
    path: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
  },
  {
    labelKey: "twitter",
    href: "https://twitter.com/negarit-ai",
    path: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z",
  },
  {
    labelKey: "linkedin",
    href: "https://linkedin.com/company/negarit-ai",
    path: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z",
  },
];

export default function Footer() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  return (
    <footer className="relative border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient">
                <svg
                  className="size-5 text-[var(--text-inverse)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                Negarit<span className="text-primary">AI</span>
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{t("footerDescription")}</p>

            <a href="/dashboard" className="btn-secondary mt-6 px-5 py-2.5 text-sm">
              {t("analyzeNow")}
            </a>
          </div>

          {/* Link columns */}
          {SECTIONS.map((section) => (
            <nav key={section.sectionKey} aria-label={t(section.sectionKey)}>
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
                {t(section.sectionKey)}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {section.items.map((item) => (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-200 hover:text-ink"
                    >
                      {t(item.key)}
                      <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <svg
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Status + socials */}
        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-[var(--border)] pt-8 md:flex-row md:items-center">
          <ul className="flex items-center gap-2">
            {SOCIALS.map((social) => (
              <li key={social.labelKey}>
                <motion.a
                  href={social.href}
                  whileHover={reduced ? undefined : { y: -3 }}
                  whileTap={reduced ? undefined : { scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  aria-label={t(social.labelKey)}
                  className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-muted transition-colors duration-200 hover:border-[var(--border-accent)] hover:bg-[var(--primary-soft)] hover:text-primary"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d={social.path} />
                  </svg>
                </motion.a>
              </li>
            ))}
          </ul>

          <p className="inline-flex items-center gap-2.5 text-sm text-muted">
            <span className="relative flex size-2">
              <span
                className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60"
                aria-hidden="true"
              />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="text-success">{t("allSystemsOperational")}</span>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-subtle">{t("copyrightFooter")}</p>
      </div>
    </footer>
  );
}
