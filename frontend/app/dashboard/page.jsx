"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { useStoredJSON } from "../../lib/store";
import { USER_STORAGE_KEY } from "../../lib/constants";
import { useLanguage } from "../../contexts/LanguageContext";
import { EASE } from "../../lib/animations";

const QUICK_LINKS = [
  {
    href: "/analyze-message",
    labelKey: "analyzeMessage",
    descKey: "detectPhishing",
    tone: "var(--primary)",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    href: "/analyze?tab=url",
    labelKey: "checkUrl",
    descKey: "scanLinks",
    tone: "var(--accent)",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    href: "/analyze-image",
    labelKey: "imageAnalysis",
    descKey: "detectDeepfakes",
    tone: "var(--success)",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
];

function riskOf(score) {
  if (score >= 60) return { color: "var(--danger)", key: "highRisk" };
  if (score >= 30) return { color: "var(--warning)", key: "suspicious" };
  return { color: "var(--success)", key: "safe" };
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [user] = useStoredJSON(USER_STORAGE_KEY, null);
  const [history] = useStoredJSON("analysisHistory", []);

  const stats = {
    total: history.length,
    threats: history.filter((x) => x.riskScore >= 60).length,
    safe: history.filter((x) => x.riskScore < 30).length,
    suspicious: history.filter((x) => x.riskScore >= 30 && x.riskScore < 60).length,
  };

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop grid="lines" orbs={2} position="fixed" />

      <div className="relative z-10 lg:ml-64">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
          {/* Greeting */}
          <motion.header
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
            className="mb-9"
          >
            <p className="text-sm font-medium text-primary">{t("welcomeBack")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              {user?.name || "User"}
            </h1>
            <p className="mt-1.5 text-sm text-muted">{t("securityCommandCenter")}</p>
          </motion.header>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={t("totalAnalyses")}
              value={stats.total}
              tone="var(--primary)"
              icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
            <StatCard
              label={t("threatsDetected")}
              value={stats.threats}
              tone="var(--danger)"
              icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
            <StatCard
              label={t("safe")}
              value={stats.safe}
              tone="var(--success)"
              icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
            <StatCard
              label={t("suspicious")}
              value={stats.suspicious}
              tone="var(--warning)"
              icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </div>

          {/* Quick actions + activity */}
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-3">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-subtle">
                {t("quickActions")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {QUICK_LINKS.map((item, i) => (
                  <motion.div
                    key={item.href + item.labelKey}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1 + i * 0.07, ease: EASE.out }}
                  >
                    <Link href={item.href} className="card group flex h-full flex-col p-5">
                      <span
                        className="grid size-10 place-items-center rounded-xl2 border transition-transform duration-300 group-hover:scale-105"
                        style={{
                          color: item.tone,
                          borderColor: `color-mix(in oklab, ${item.tone} 28%, transparent)`,
                          backgroundColor: `color-mix(in oklab, ${item.tone} 12%, transparent)`,
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
                          <path d={item.icon} />
                        </svg>
                      </span>
                      <h3 className="mt-4 text-sm font-bold text-ink">{t(item.labelKey)}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-subtle">
                        {t(item.descKey)}
                      </p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-2">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-subtle">
                {t("recentActivity")}
              </h2>
              <div className="surface min-h-[19rem] rounded-xl2 p-5">
                {history.length === 0 ? (
                  <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center">
                    <span className="grid size-12 place-items-center rounded-xl2 bg-[var(--border)] text-subtle">
                      <svg
                        className="size-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <p className="mt-4 text-sm font-medium text-muted">{t("noAnalysesYet")}</p>
                    <Link
                      href="/analyze-message"
                      className="mt-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
                    >
                      {t("runFirstScan")} →
                    </Link>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {history.slice(0, 8).map((item, i) => {
                      const score = item.riskScore ?? 0;
                      const risk = riskOf(score);

                      return (
                        <motion.li
                          key={item.id ?? i}
                          initial={reduced ? { opacity: 1 } : { opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: i * 0.04, ease: EASE.out }}
                          className="flex items-start gap-3 border-b border-[var(--border)] py-3 last:border-0"
                        >
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: risk.color }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">
                              {item.input || "Image"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle">
                              <span className="uppercase tracking-wide">{item.type}</span>
                              <span aria-hidden="true">•</span>
                              <span>
                                {t("scoreLabel")} {score}
                              </span>
                              <span aria-hidden="true">•</span>
                              <span className="font-semibold" style={{ color: risk.color }}>
                                {item.verdict || t(risk.key)}
                              </span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat tile with an animated counter ─────────────────────────────── */
function StatCard({ label, value, tone, icon }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
      animate={inView || reduced ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: EASE.out }}
      whileHover={reduced ? undefined : { y: -3 }}
      className="card p-5"
    >
      <span
        className="grid size-10 place-items-center rounded-xl2 border"
        style={{
          color: tone,
          borderColor: `color-mix(in oklab, ${tone} 26%, transparent)`,
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

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
        <Counter to={value} animate={inView} />
      </p>
      <p className="mt-1 text-xs text-subtle">{label}</p>
    </motion.div>
  );
}

function Counter({ to, animate }) {
  const reduced = useReducedMotion();
  const shouldAnimate = Boolean(animate) && !reduced && to > 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) return;

    let frame;
    const start = performance.now();
    const duration = 750;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(eased * to));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, shouldAnimate]);

  return shouldAnimate ? display : to;
}
