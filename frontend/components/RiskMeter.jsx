"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../lib/animations";

/**
 * Single source of truth for how a numeric risk score is presented.
 * The backend returns 0–100; everything visual derives from here.
 */
export function riskFor(score = 0) {
  if (score >= 60) return { tone: "danger", color: "var(--danger)", soft: "var(--danger-soft)" };
  if (score >= 30) return { tone: "warning", color: "var(--warning)", soft: "var(--warning-soft)" };
  return { tone: "success", color: "var(--success)", soft: "var(--success-soft)" };
}

const VERDICT_TONE = {
  Safe: "success",
  Legitimate: "success",
  Trusted: "success",
  Suspicious: "warning",
  Unknown: "info",
};

/** Pill showing a verdict with a matching dot and tinted surface. */
export function VerdictBadge({ verdict, score, className = "" }) {
  const byScore = score != null ? riskFor(score).tone : null;
  const tone = byScore ?? VERDICT_TONE[verdict] ?? "danger";
  const color = riskFor(score ?? (verdict === "Safe" ? 0 : 80)).color;

  const styles = {
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-sm font-bold ${styles[tone]} ${className}`}
    >
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {verdict}
      {score != null ? (
        <span className="font-mono text-xs font-semibold opacity-80">{score}/100</span>
      ) : null}
      <span className="sr-only" style={{ color }}>
        risk
      </span>
    </span>
  );
}

/** Horizontal meter that fills to the score when it scrolls into view. */
export function RiskBar({ score = 0, label }) {
  const reduced = useReducedMotion();
  const risk = riskFor(score);

  return (
    <div>
      {label ? (
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <span className="font-mono text-lg font-bold" style={{ color: risk.color }}>
            {score}
            <span className="text-xs font-medium text-subtle"> / 100</span>
          </span>
        </div>
      ) : null}

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Risk score"}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: risk.color,
            backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${risk.color} 55%, transparent), ${risk.color})`,
          }}
          initial={reduced ? { width: `${score}%` } : { width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE.out }}
        />
      </div>
    </div>
  );
}

/** Large radial gauge for headline results. */
export function RadialScore({ score = 0, size = 7, label }) {
  const risk = riskFor(score);
  const circumference = 2 * Math.PI * 15.5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: `${size}rem`, height: `${size}rem` }}>
        <svg
          className="size-full -rotate-90"
          viewBox="0 0 36 36"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="var(--border)"
            strokeWidth="2.5"
          />
          <motion.circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={risk.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference - (score / 100) * circumference }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: EASE.out }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <span
            className="text-3xl font-extrabold tabular-nums"
            style={{ color: risk.color }}
          >
            {score}
          </span>
        </span>
      </div>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-subtle">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** Compact labelled metric used in the sender/reputation breakdowns. */
export function MetricTile({ label, value, tone = "neutral", capitalize }) {
  const colors = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
    neutral: "text-ink",
  };

  return (
    <div className="surface rounded-xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-subtle">{label}</p>
      <p className={`mt-1.5 text-sm font-bold ${colors[tone] ?? colors.neutral} ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/** Maps a reputation word to a status tone. */
export function reputationTone(value) {
  const v = String(value ?? "").toLowerCase();
  if (["safe", "legitimate", "trusted", "good"].includes(v)) return "success";
  if (["suspicious", "medium", "unknown"].includes(v)) return "warning";
  if (["malicious", "danger", "phishing", "bad", "high"].includes(v)) return "danger";
  return "neutral";
}
