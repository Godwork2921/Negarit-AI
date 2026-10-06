"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { riskFor } from "../../components/RiskMeter";
import { useStoredJSON } from "../../lib/store";
import { useLanguage } from "../../contexts/LanguageContext";
import { EASE } from "../../lib/animations";

const FILTERS = ["all", "message", "image"];

export default function ThreatHistoryPage() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [history] = useStoredJSON("analysisHistory", []);
  const [filter, setFilter] = useState("all");

  const rows = useMemo(
    () => (filter === "all" ? history : history.filter((h) => h.type === filter)),
    [history, filter]
  );

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop grid="lines" orbs={1} position="fixed" />

      <main className="relative z-10 lg:ml-64">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
          <motion.header
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
            className="mb-8 flex flex-wrap items-end justify-between gap-5"
          >
            <div>
              <p className="eyebrow">{t("dashboard")}</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                {t("threatHistory")}
              </h1>
            </div>

            <div
              role="group"
              aria-label="Filter history"
              className="flex gap-1 rounded-xl2 border border-[var(--border)] bg-[var(--surface)] p-1"
            >
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition-colors duration-200 ${
                    filter === f
                      ? "bg-[var(--primary-soft)] text-primary"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </motion.header>

          {rows.length === 0 ? (
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE.out }}
              className="surface flex flex-col items-center justify-center rounded-xl2 px-6 py-20 text-center"
            >
              <span className="grid size-14 place-items-center rounded-xl2 bg-[var(--border)] text-subtle">
                <svg
                  className="size-7"
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
              <p className="mt-5 text-sm font-semibold text-ink">{t("noThreatHistory")}</p>
              <p className="mt-1 text-sm text-muted">{t("runAnalysisToSee")}</p>
              <Link href="/analyze-message" className="btn-primary mt-6 px-5 py-2.5 text-sm">
                {t("analyzeContent")}
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE.out }}
              className="surface overflow-hidden rounded-xl2"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-sm">
                  <caption className="sr-only">{t("threatHistory")}</caption>
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      {[t("type"), t("content"), t("scoreLabel"), t("verdict")].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-subtle"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {rows.map((item) => {
                        const score = item.riskScore ?? 0;
                        const risk = riskFor(score);

                        return (
                          <motion.tr
                            key={item.id}
                            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="border-b border-[var(--border)] transition-colors duration-200 last:border-0 hover:bg-[var(--primary-soft)]/40"
                          >
                            <td className="px-5 py-4">
                              <span className="badge badge-primary capitalize">
                                {item.type || "unknown"}
                              </span>
                            </td>
                            <td className="max-w-[22rem] truncate px-5 py-4 text-muted">
                              {item.input || "—"}
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-2 font-mono font-semibold">
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: risk.color }}
                                />
                                <span style={{ color: risk.color }}>{score}</span>
                              </span>
                            </td>
                            <td className="px-5 py-4 font-semibold" style={{ color: risk.color }}>
                              {item.verdict || "—"}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
