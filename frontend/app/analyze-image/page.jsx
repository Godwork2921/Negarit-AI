"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { VerdictBadge, RiskBar, MetricTile } from "../../components/RiskMeter";
import { analyzeImage } from "../../lib/api";
import { useLanguage } from "../../contexts/LanguageContext";
import { EASE, SPRING } from "../../lib/animations";

const rise = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: EASE.out },
  }),
};

export default function AnalyzeImagePage() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setPreview(null);
    setBase64("");
    setResult(null);
    setFileName("");
    setError("");
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setBase64(String(reader.result).split(",")[1]);
      setPreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleAnalyze = async () => {
    if (!base64) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeImage(base64);
      setResult(data);
      const history = JSON.parse(localStorage.getItem("analysisHistory") || "[]");
      history.unshift({
        type: "image",
        input: fileName || "Image upload",
        ...data,
        id: Date.now(),
      });
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
  const authenticity = 100 - score;

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
            <p className="eyebrow">{t("imageAnalysis")}</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              {t("imageDeepfakeAnalysis")}
            </h1>
          </motion.header>

          {/* ── Dropzone ── */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE.out }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !preview && inputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !preview) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t("uploadImage")}
            className={`cursor-pointer rounded-xl2 border-2 border-dashed p-8 text-center transition-colors duration-300 md:p-12 ${
              dragging
                ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--border-accent)]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {preview ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={preview}
                  alt="Selected image preview"
                  className="max-h-56 rounded-xl2 border border-[var(--border)] object-contain"
                />
                <p className="text-sm font-medium text-muted">{fileName}</p>
              </div>
            ) : (
              <>
                <span className="mx-auto grid size-14 place-items-center rounded-xl2 bg-[var(--primary-soft)] text-primary">
                  <svg
                    className="size-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <p className="mt-4 text-sm font-semibold text-ink">{t("dropImageHere")}</p>
                <p className="mt-1 text-xs text-subtle">{t("maxSizeFormats")}</p>
              </>
            )}
          </motion.div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[var(--danger)]/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          {preview && !loading && !result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 flex flex-wrap gap-3"
            >
              <motion.button
                onClick={handleAnalyze}
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                transition={SPRING.snappy}
                className="btn-primary px-6 py-3"
              >
                {t("analyzeImageBtn")}
              </motion.button>
              <motion.button
                onClick={reset}
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={reduced ? undefined : { scale: 0.98 }}
                transition={SPRING.snappy}
                className="btn-secondary px-6 py-3"
              >
                {t("remove")}
              </motion.button>
            </motion.div>
          ) : null}

          {/* ── Results ── */}
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
                <p className="text-sm font-medium text-muted">{t("analyzingImage")}</p>
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
                    {t("analysisResultsId")}
                    {result.id ? String(result.id).slice(-4) : ""}
                  </h2>
                  <VerdictBadge verdict={result.verdict || "Unknown"} score={score} />
                </div>

                <div className="mt-6 grid gap-7 md:grid-cols-[minmax(0,1fr)_14rem]">
                  <div className="space-y-6">
                    <RiskBar score={score} label={t("deepfakeProbability")} />

                    <p className="text-sm font-semibold text-ink">
                      {score < 30
                        ? t("lowLikelihood")
                        : score < 60
                          ? t("possibleAiGeneration")
                          : t("highLikelihood")}
                    </p>

                    <motion.div custom={1} variants={rise} initial="hidden" animate="visible">
                      <h3 className="text-sm font-bold text-ink">{t("logoDetection")}</h3>
                      <p className="mt-1.5 text-sm text-muted">
                        {result.verdict === "Authentic"
                          ? t("noAiLogosDetected")
                          : "Adobe Photoshop / Generative AI tooling detected — "}
                        {result.verdict !== "Authentic" ? (
                          <span className="font-semibold text-primary">
                            {score}% {t("confidenceScore")}
                          </span>
                        ) : null}
                      </p>
                    </motion.div>

                    <motion.div custom={2} variants={rise} initial="hidden" animate="visible">
                      <h3 className="text-sm font-bold text-ink">{t("forgeryDetection")}</h3>
                      <p
                        className="mt-1.5 text-sm font-semibold"
                        style={{ color: score >= 50 ? "var(--danger)" : "var(--success)" }}
                      >
                        {score >= 50 ? t("forgeryThreat") : t("forgeryClear")}
                      </p>
                    </motion.div>
                  </div>

                  <motion.div custom={1} variants={rise} initial="hidden" animate="visible" className="space-y-3">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Analysed image"
                        className="w-full rounded-xl2 border border-[var(--border)] object-cover"
                      />
                    ) : null}
                    <MetricTile
                      label={t("imageAuthenticity")}
                      value={`${authenticity}/100`}
                      tone={authenticity >= 60 ? "success" : authenticity >= 30 ? "warning" : "danger"}
                    />
                    <MetricTile
                      label={t("sourceImage")}
                      value={fileName || "—"}
                    />
                  </motion.div>
                </div>

                <motion.div custom={3} variants={rise} initial="hidden" animate="visible" className="mt-7">
                  <h3 className="text-sm font-bold text-ink">{t("aiRecommendation")}</h3>
                  <span
                    className={`mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white ${
                      score >= 50 ? "bg-[var(--danger)]" : "bg-[var(--success)]"
                    }`}
                  >
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
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    {score >= 50 ? t("blockRecommendation") : t("allowRecommendation")}
                  </span>
                </motion.div>

                {result.explanation || result.flags?.length > 0 ? (
                  <motion.div custom={4} variants={rise} initial="hidden" animate="visible" className="mt-7">
                    <h3 className="text-sm font-bold text-ink">{t("analysisDetails")}</h3>
                    <div className="mt-2.5 rounded-xl2 border border-[var(--border)] bg-[var(--bg)] p-4">
                      {result.explanation ? (
                        <p className="text-sm leading-relaxed text-muted">{result.explanation}</p>
                      ) : null}
                      {result.flags?.length > 0 ? (
                        <ul className="mt-2 space-y-1.5">
                          {result.flags.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}

                <motion.div custom={5} variants={rise} initial="hidden" animate="visible" className="mt-7 flex flex-wrap gap-3">
                  <motion.button
                    onClick={copyReport}
                    whileHover={reduced ? undefined : { y: -2 }}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={SPRING.snappy}
                    className="btn-secondary px-5 py-2.5 text-sm"
                  >
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
