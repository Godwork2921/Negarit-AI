"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { SPRING } from "../lib/animations";
import AmbientBackdrop from "./AmbientBackdrop";
import { SectionHeader, RevealGroup, RevealItem } from "./Reveal";

const FEATURES = [
  {
    titleKey: "aiMessageAnalysisTitle",
    descKey: "aiMessageAnalysisDesc",
    tone: "var(--danger)",
    icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  },
  {
    titleKey: "imageDeepfakeDetectionTitle",
    descKey: "imageDeepfakeDetectionDesc",
    tone: "var(--accent)",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  },
  {
    titleKey: "urlScannerTitle",
    descKey: "urlScannerDesc",
    tone: "var(--info)",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    titleKey: "platformSupportTitle",
    descKey: "platformSupportDesc",
    tone: "var(--success)",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    titleKey: "realtimeAlertsTitle",
    descKey: "realtimeAlertsDesc",
    tone: "var(--warning)",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    titleKey: "enterpriseReportsTitle",
    descKey: "enterpriseReportsDesc",
    tone: "var(--primary)",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

export default function Features() {
  const { t } = useLanguage();

  return (
    <section id="features" aria-labelledby="features-heading" className="section">
      <AmbientBackdrop grid="dots" orbs={1} />

      <div className="container-page">
        <div id="features-heading">
          <SectionHeader eyebrow={t("navFeatures")} title={t("everythingToStaySafe")} lede={t("sixEnginesWorking")} />
        </div>

        <RevealGroup
          stagger={0.07}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <RevealItem key={f.titleKey} as="div" className="h-full">
              <FeatureCard
                title={t(f.titleKey)}
                description={t(f.descKey)}
                icon={f.icon}
                tone={f.tone}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── Card with pointer-tracked spotlight ────────────────────────────── */
function FeatureCard({ title, description, icon, tone }) {
  const ref = useRef(null);
  const [spotlight, setSpotlight] = useState(false);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <motion.article
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setSpotlight(true)}
      onMouseLeave={() => setSpotlight(false)}
      whileHover={{ y: -5 }}
      transition={SPRING.smooth}
      className="card group h-full overflow-hidden p-6"
    >
      {/* Pointer spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: spotlight
            ? "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)"
            : undefined,
        }}
      />

      <div className="relative flex items-start gap-4">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl2 border transition-transform duration-300 group-hover:scale-105"
          style={{
            color: tone,
            borderColor: `color-mix(in oklab, ${tone} 28%, transparent)`,
            backgroundColor: `color-mix(in oklab, ${tone} 12%, transparent)`,
          }}
        >
          <svg
            className="size-5"
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
        </span>

        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug text-ink">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>
    </motion.article>
  );
}
