"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { analyzeMessage, checkUrl, analyzeImage } from "../../lib/api";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { RadialScore, VerdictBadge } from "../../components/RiskMeter";
import { useStoredJSON } from "../../lib/store";
import { Button } from "../../components/UI";
import { EASE, SPRING } from "../../lib/animations";
import { useLanguage } from "../../contexts/LanguageContext";

const TABS = [
  {
    id: "message",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    id: "url",
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    id: "image",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
];

function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeWorkspace />
    </Suspense>
  );
}

function AnalyzeWorkspace() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [tabChoice, setTabChoice] = useState("message");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [history, setHistory] = useStoredJSON("analysisHistory", []);

  // URL wins over the local choice so /analyze?tab=url deep-links work.
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam && TABS.some((item) => item.id === tabParam) ? tabParam : tabChoice;

  const saveToHistory = (entry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 20));
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setError("");
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!input) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let data;
      if (activeTab === "message") data = await analyzeMessage(input);
      else if (activeTab === "url") data = await checkUrl(input);
      else data = await analyzeImage(input);
      setResult(data);
      saveToHistory({ type: activeTab, input: input.slice(0, 100), ...data, id: Date.now() });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInput(reader.result.split(",")[1]);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const tabLabel = (id) =>
    id === "message" ? t("messageTab") : id === "url" ? t("urlTab") : t("imageTab");

  const tabDesc = (id) =>
    id === "message" ? t("messageTabDesc") : id === "url" ? t("urlTabDesc") : t("imageTabDesc");

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-20 lg:ml-64 lg:pt-12">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out }}
          className="mb-8"
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {t("threatAnalysis")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{t("submitContent")}</p>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* â”€â”€ Input â”€â”€ */}
          <motion.section
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
            className="card flex flex-col p-6"
          >
            <div
              role="tablist"
              aria-label={t("threatAnalysis")}
              className="mb-6 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1"
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setTabChoice(tab.id);
                      reset();
                    }}
                    className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active ? "text-[var(--text-inverse)]" : "text-muted hover:text-ink"
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId="analyze-tab"
                        transition={SPRING.snappy}
                        className="absolute inset-0 rounded-xl bg-brand-gradient"
                      />
                    ) : null}
                    <svg
                      className="relative size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d={tab.icon} />
                    </svg>
                    <span className="relative">{tabLabel(tab.id)}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-5 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl2 bg-primary-soft text-primary">
                <svg
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d={TABS.find((item) => item.id === activeTab)?.icon} />
                </svg>
              </span>
              <div>
                <h2 className="font-bold text-ink">
                  {tabLabel(activeTab)} {t("analysis")}
                </h2>
                <p className="text-xs text-subtle">{tabDesc(activeTab)}</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex flex-1 flex-col gap-4"
            >
              {activeTab === "image" ? (
                <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] transition-colors hover:border-primary/50 focus-within:border-primary">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={t("imagePreview")}
                      className="max-h-52 rounded-xl object-contain"
                    />
                  ) : (
                    <>
                      <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                        <svg
                          className="size-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeWidth={1.5}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </span>
                      <span className="mt-3 text-sm font-semibold text-ink">
                        {t("clickToUpload")}
                      </span>
                      <p className="mt-1 text-xs text-subtle">{t("pngJpgSupported")}</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                  />
                </label>
              ) : (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeTab === "url" ? t("enterUrl") : t("pasteMessageHere")}
                  rows={8}
                  aria-label={tabLabel(activeTab)}
                  className="textarea-field resize-none"
                />
              )}

              {error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-[var(--danger)]/30 bg-danger-soft px-4 py-3 text-sm text-danger"
                >
                  {error}
                </p>
              ) : null}

              <div className="mt-auto flex gap-3 pt-1">
                <Button type="submit" disabled={loading || !input} className="flex-1 py-3">
                  {loading ? (
                    <>
                      <span
                        className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        aria-hidden="true"
                      />
                      {t("analyzingButton")}
                    </>
                  ) : (
                    <>
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                        />
                      </svg>
                      {t("analyzeContent")}
                    </>
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={reset} className="px-5">
                  {t("clear")}
                </Button>
              </div>
            </form>
          </motion.section>

          {/* â”€â”€ Results â”€â”€ */}
          <motion.section
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE.out }}
            className="card flex min-h-[28rem] flex-col p-6"
          >
            <h3 className="mb-5 text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">
              {t("results")}
            </h3>

            <AnimatePresence mode="wait">
              {!result && !error && !loading ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col items-center justify-center text-center"
                >
                  <span className="grid size-16 place-items-center rounded-3xl bg-[var(--surface-2)] text-subtle">
                    <svg
                      className="size-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeWidth={1}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </span>
                  <p className="mt-4 text-sm font-medium text-muted">{t("submitToSeeResults")}</p>
                  <p className="mt-1 text-xs text-subtle">{t("aiWillReturn")}</p>
                </motion.div>
              ) : null}

              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col items-center justify-center text-center"
                >
                  <motion.span
                    className="size-12 rounded-full border-[3px] border-primary/20 border-t-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    aria-hidden="true"
                  />
                  <p className="mt-5 text-sm font-semibold text-ink">{t("aiAnalyzing")}</p>
                  <p className="mt-1 text-xs text-subtle">{t("checkingPatterns")}</p>
                </motion.div>
              ) : null}

              {result && !loading ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE.out }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center gap-6">
                    <RadialScore score={result.riskScore ?? 0} size={6} label={t("riskScore")} />
                    <div className="min-w-0 flex-1 space-y-3">
                      <VerdictBadge
                        verdict={result.verdict || t("unknown")}
                        score={result.riskScore}
                      />
                      <p className="text-sm leading-relaxed text-muted">{result.explanation}</p>
                    </div>
                  </div>

                  {result.flags?.length > 0 ? (
                    <div className="rounded-2xl border border-[var(--danger)]/25 bg-danger-soft p-4">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-danger">
                        {t("detectedFlags")}
                      </p>
                      <ul className="space-y-2">
                        {result.flags.map((flag, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
                            <span
                              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger"
                              aria-hidden="true"
                            />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
                    <div>
                      <dt className="text-xs text-subtle">{t("type")}</dt>
                      <dd className="mt-0.5 font-semibold capitalize text-ink">{activeTab}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-subtle">{t("verdict")}</dt>
                      <dd className="mt-0.5 font-semibold text-ink">
                        {result.verdict || t("unknown")}
                      </dd>
                    </div>
                  </dl>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>
        </div>

        {history.length > 0 ? (
          <p className="mt-8 text-center text-xs text-subtle">
            {history.length} {t("recentScans")}
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default AnalyzePage;