"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { SPRING } from "../lib/animations";
import AmbientBackdrop from "./AmbientBackdrop";
import { SectionHeader, RevealGroup, RevealItem } from "./Reveal";

const FAQS = [
  { qKey: "faq1Q", aKey: "faq1A" },
  { qKey: "faq2Q", aKey: "faq2A" },
  { qKey: "faq3Q", aKey: "faq3A" },
  { qKey: "faq4Q", aKey: "faq4A" },
  { qKey: "faq5Q", aKey: "faq5A" },
];

export default function FAQ() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(0);
  const baseId = useId();
  const reduced = useReducedMotion();

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="section section-alt border-t border-[var(--border)]"
    >
      <AmbientBackdrop grid="lines" orbs={1} />

      <div className="container-page">
        <div className="mx-auto max-w-3xl">
          <div id="faq-heading">
            <SectionHeader
              eyebrow={t("navFaq")}
              title={t("faqSectionTitle")}
              lede={t("faqSectionDesc")}
            />
          </div>

          <RevealGroup stagger={0.06} className="mt-12 space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              const panelId = `${baseId}-panel-${i}`;
              const buttonId = `${baseId}-button-${i}`;

              return (
                <RevealItem
                  key={faq.qKey}
                  as="div"
                  className={`overflow-hidden rounded-xl2 border transition-colors duration-300 ${
                    isOpen
                      ? "border-[var(--border-accent)] bg-[var(--primary-soft)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <h3>
                    <button
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? -1 : i)}
                      className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-6"
                    >
                      <span
                        className={`text-[15px] font-semibold leading-snug transition-colors duration-200 md:text-base ${
                          isOpen ? "text-primary" : "text-ink"
                        }`}
                      >
                        {t(faq.qKey)}
                      </span>

                      <motion.span
                        animate={{ rotate: isOpen ? 135 : 0 }}
                        transition={SPRING.bouncy}
                        className={`grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-200 ${
                          isOpen
                            ? "border-transparent bg-brand-gradient text-[var(--text-inverse)]"
                            : "border-[var(--border)] text-muted"
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          className="size-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </motion.span>
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        key="panel"
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{
                          height: SPRING.smooth,
                          opacity: { duration: reduced ? 0 : 0.2 },
                        }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm leading-relaxed text-muted md:px-6">
                          {t(faq.aKey)}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
