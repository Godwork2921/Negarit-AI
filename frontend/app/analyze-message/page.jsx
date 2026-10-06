"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { VerdictBadge, RiskBar, MetricTile, reputationTone } from "../../components/RiskMeter";
import { analyzeMessage } from "../../lib/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { EASE, SPRING } from "../../lib/animations";

const SAMPLE = "URGENT: Your Microsoft 365 account will be suspended in 2 hours due to irregular activity. Please verify your identity immediately to prevent lockout.\nVerify here: https://m1crosoft-security.net/auth/login?token=abc";

const rise = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: EASE.out },
  }),
};

export default function AnalyzeMessagePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const [message, setMessage] = useState(SAMPLE);
  const [senderEmail, setSenderEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeMessage(message, { senderEmail, domain, senderPhone });
      setResult(data);
      const history = JSON.parse(localStorage.getItem("analysisHistory") || "[]");
      history.unshift({ type: "message", input: message.slice(0, 100), ...data, id: Date.now() });
      localStorage.setItem("analysisHistory", JSON.stringify(history.slice(0, 20)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard unavailable in this browser.");
    }
  };

  const score = result?.riskScore ?? 0;

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop grid="lines" orbs={2} position="fixed" />

      <main className="relative z-10 lg:ml-64">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8 md:py-10">
          <motion.header
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE.out }}
            className="mb-8"
          >
            <p className="eyebrow">{t("navAnalyze")}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              {t("analyzeMessage")}
            </h1>
          </motion.header>

          {/* â”€â”€ Input card â”€â”€ */}
          <motion.section
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE.out }}
            aria-label={t("analyzeContent")}
            className="surface rounded-xl2 p-5 md:p-6"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label={t("senderEmailOptional")}
                type="email"
                value={senderEmail}
                placeholder={t("senderEmailPlaceholder")}
                onChange={(v) => {
                  setSenderEmail(v);
                  setResult(null);
                }}
              />
              <Field
                label={t("domainOptional")}
                value={domain}
                placeholder={t("domainPlaceholder")}
                onChange={(v) => {
                  setDomain(v);
                  setResult(null);
                }}
              />
              <Field
                label={t("senderPhoneOptional")}
                value={senderPhone}
                placeholder={t("senderPhonePlaceholder")}
                onChange={(v) => {
                  setSenderPhone(v);
                  setResult(null);
                }}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="message" className="sr-only">
                {t("messagePlaceholder")}
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setResult(null);
                }}
                rows={6}
                placeholder={t("messagePlaceholder")}
                className="input-field resize-y font-mono text-[13px] leading-relaxed"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <motion.button
                onClick={handleAnalyze}
                disabled={loading || !message.trim()}
                whileHover={reduced || loading ? undefined : { y: -2 }}
                whileTap={reduced || loading ? undefined : { scale: 0.98 }}
                transition={SPRING.snappy}
                className="btn-primary px-6 py-3"
              >
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
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.35-4.35" />
                    </svg>
                    {t("analyzeContent")}
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={() => router.push("/analyze-image")}
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                transition={SPRING.snappy}
                className="btn-secondary px-6 py-3"
              >
                {t("uploadScreenshot")}
              </motion.button>
            </div>
          </motion.section>

          {/* â”€â”€ Results â”€â”€ */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.section
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-live="polite"
                className="surface mt-6 flex flex-col items-center justify-center gap-5 p-14"
              >
                <motion.span
                  className="size-14 rounded-full border-[3px] border-[var(--border)] border-t-[var(--primary)]"
                  animate={reduced ? undefined : { rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="text-sm font-medium text-muted">{t("aiAnalyzingMessage")}</p>
              </motion.section>
            ) : null}

            {result && !loading ? (
              <motion.section
                key="result"
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE.out }}
                className="surface mt-6 rounded-xl2 p-5 md:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 className="text-xl font-extrabold tracking-tight text-ink">
                    {t("analysisComplete")}
                  </h2>
                  <VerdictBadge verdict={result.verdict || "Unknown"} score={score} />
                </div>

                <div className="mt-6">
                  <RiskBar score={score} />
                </div>

                {result.explanation ? (
                  <motion.p
                    custom={1}
                    variants={rise}
                    initial="hidden"
                    animate="visible"
                    className="mt-6 text-sm leading-relaxed text-muted"
                  >
                    {result.explanation}
                  </motion.p>
                ) : null}

                {result.flags?.length > 0 ? (
                  <motion.div custom={2} variants={rise} initial="hidden" animate="visible" className="mt-7">
                    <h3 className="text-sm font-bold text-ink">{t("detectedFlags")}</h3>
                    <ul className="mt-3 space-y-2">
                      {result.flags.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 rounded-lg bg-danger-soft/60 px-3 py-2 text-sm text-muted"
                        >
                          <svg
                            className="mt-0.5 size-4 shrink-0 text-danger"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : null}

                {result.senderAnalysis ? (
                  <motion.div
                    custom={3}
                    variants={rise}
                    initial="hidden"
                    animate="visible"
                    className="mt-7 rounded-xl2 border border-[var(--border)] bg-[var(--bg)] p-5"
                  >
                    <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                      <svg
                        className="size-4 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      {t("senderAnalysisTitle")}
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {result.senderAnalysis.senderVerdict ? (
                        <MetricTile
                          label={t("senderVerdict")}
                          value={result.senderAnalysis.senderVerdict}
                          tone={reputationTone(result.senderAnalysis.senderVerdict)}
                        />
                      ) : null}
                      {result.senderAnalysis.emailReputation ? (
                        <MetricTile
                          label={t("emailReputation")}
                          value={result.senderAnalysis.emailReputation}
                          tone={reputationTone(result.senderAnalysis.emailReputation)}
                          capitalize
                        />
                      ) : null}
                      {result.senderAnalysis.domainReputation ? (
                        <MetricTile
                          label={t("domainReputation")}
                          value={result.senderAnalysis.domainReputation}
                          tone={reputationTone(result.senderAnalysis.domainReputation)}
                          capitalize
                        />
                      ) : null}
                      {result.senderAnalysis.phoneReputation ? (
                        <MetricTile
                          label={t("phoneReputation")}
                          value={result.senderAnalysis.phoneReputation}
                          tone={reputationTone(result.senderAnalysis.phoneReputation)}
                          capitalize
                        />
                      ) : null}
                    </div>

                    {result.senderAnalysis.details ? (
                      <p className="mt-4 text-sm leading-relaxed text-muted">
                        {result.senderAnalysis.details}
                      </p>
                    ) : null}
                  </motion.div>
                ) : null}

                <motion.div custom={4} variants={rise} initial="hidden" animate="visible" className="mt-7 flex flex-wrap gap-3">
                  <motion.button
                    onClick={copyReport}
                    whileHover={reduced ? undefined : { y: -2 }}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={SPRING.snappy}
                    className="btn-secondary px-5 py-2.5 text-sm"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M9 9V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4M5 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
                    </svg>
                    {copied ? "Copied" : t("copyReport")}
                  </motion.button>
                </motion.div>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Field({ label, type = "text", value, placeholder, onChange }) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input-field py-2.5"
      />
    </div>
  );
}
