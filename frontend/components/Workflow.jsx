"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { EASE, SPRING } from "../lib/animations";
import AmbientBackdrop from "./AmbientBackdrop";
import { SectionHeader, RevealGroup, RevealItem } from "./Reveal";

const STEPS = [
  {
    titleKey: "submitContentStep",
    descKey: "submitContentStepDesc",
    icon: "M12 4v16m0 0-6-6m6 6 6-6",
  },
  {
    titleKey: "aiAnalysisStep",
    descKey: "aiAnalysisStepDesc",
    icon: "M9.75 17L9 20l-1-1m8 0 1 1-1-1m-9.75 0h9.75M9 4.75V4m0 0L8.25 5.25M9 4l.75 1.25M15 4.75V4m0 0 .75 1.25M15 4l-.75 1.25M6.75 8H6m0 0-.75.75M6 8l.75.75m11.25 0H18m0 0 .75.75M18 8l-.75.75M9 13.5h6",
  },
  {
    titleKey: "getResultsStep",
    descKey: "getResultsStepDesc",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

export default function Workflow() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  return (
    <section
      id="workflow"
      aria-labelledby="workflow-heading"
      className="section section-alt border-y border-[var(--border)]"
    >
      <AmbientBackdrop grid="lines" orbs={2} />

      <div className="container-page">
        <div id="workflow-heading">
          <SectionHeader
            eyebrow={t("navHowItWorks")}
            title={t("securityInThreeSteps")}
            lede={t("workflowDesc")}
          />
        </div>

        {/* Connector: a gradient rule that draws itself in */}
        <div
          aria-hidden="true"
          className="relative mx-auto mt-16 hidden max-w-4xl lg:block"
        >
          <motion.div
            className="h-px origin-left bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: 1.1, ease: EASE.out }}
          />
        </div>

        <RevealGroup
          stagger={0.14}
          className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8"
        >
          {STEPS.map((step, i) => (
            <RevealItem key={step.titleKey} as="div" className="relative">
              <StepCard
                index={i}
                title={t(step.titleKey)}
                description={t(step.descKey)}
                icon={step.icon}
                isLast={i === STEPS.length - 1}
                reduced={reduced}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function StepCard({ index, title, description, icon, isLast, reduced }) {
  return (
    <div className="group relative flex flex-col items-center text-center md:px-4">
      <motion.div
        whileHover={reduced ? undefined : { scale: 1.06, y: -3 }}
        transition={SPRING.bouncy}
        className="relative z-10 grid size-[4.5rem] place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] transition-colors duration-300 group-hover:border-[var(--border-accent)]"
      >
        <span className="absolute inset-0 rounded-2xl bg-brand-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <svg
          className="relative size-7 text-primary transition-colors duration-300 group-hover:text-[var(--text-inverse)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d={icon} />
        </svg>

        <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[11px] font-bold text-subtle">
          {String(index + 1).padStart(2, "0")}
        </span>
      </motion.div>

      {/* Travelling chevron between steps */}
      {!isLast ? (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 top-[2.1rem] hidden text-[var(--primary)]/40 md:block"
          animate={reduced ? undefined : { x: [0, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </motion.span>
      ) : null}

      <h3 className="mt-6 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
