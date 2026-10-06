"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE, SPRING } from "../lib/animations";

const sizeMap = {
  sm: "size-5 border-2",
  md: "size-8 border-2",
  lg: "size-12 border-[3px]",
};

export function LoadingSpinner({ size = "md", message, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`animate-spin rounded-full border-[var(--border-strong)] border-t-[var(--primary)] ${sizeMap[size]}`}
      />
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      <span className="sr-only">Loading</span>
    </div>
  );
}

const toneStyles = {
  success: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  primary: "bg-primary-soft text-primary",
  neutral: "bg-[var(--border)] text-muted",
};

const toneIcons = {
  success: "M5 13l4 4L19 7",
  error: "M6 6l12 12M18 6L6 18",
  danger: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  warning: "M12 9v4m0 4h.01M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z",
  info: "M12 16v-4m0-4h.01M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z",
  primary: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  neutral: "M6 6l12 12M18 6L6 18",
};

export function Toast({ message, tone = "info", onClose, title }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.97 }}
      transition={SPRING.snappy}
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl2 border border-[var(--border)] bg-[var(--surface-overlay)] p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl"
    >
      <span
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${toneStyles[tone] ?? toneStyles.info}`}
      >
        <svg
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d={toneIcons[tone] ?? toneIcons.info} />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold text-ink">{title}</p> : null}
        <p className="text-sm leading-relaxed text-muted">{message}</p>
      </div>

      {onClose ? (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 grid size-6 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-[var(--border)] hover:text-ink"
        >
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
    </motion.div>
  );
}

export function Badge({ children, tone = "neutral", size = "md", className = "", dot }) {
  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  };

  return (
    <span className={`badge ${sizes[size]} ${toneStyles[tone] ?? toneStyles.neutral} ${className}`}>
      {dot ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}

export function Alert({ title, children, tone = "info", onClose }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={SPRING.snappy}
      role={tone === "error" || tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl2 border p-4 ${
        tone === "success"
          ? "border-[var(--success)]/30 bg-success-soft"
          : tone === "warning"
            ? "border-[var(--warning)]/30 bg-warning-soft"
            : tone === "error" || tone === "danger"
              ? "border-[var(--danger)]/30 bg-danger-soft"
              : "border-[var(--info)]/30 bg-info-soft"
      }`}
    >
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${
          toneStyles[tone] ?? toneStyles.info
        }`}
      >
        <svg
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d={toneIcons[tone] ?? toneIcons.info} />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold text-ink">{title}</p> : null}
        {children ? (
          <div className="text-sm leading-relaxed text-muted">{children}</div>
        ) : null}
      </div>

      {onClose ? (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 grid size-6 shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-[var(--border)] hover:text-ink"
        >
          <svg
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
    </motion.div>
  );
}

const buttonVariants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const buttonSizes = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
  as = "button",
  ...props
}) {
  const isInert = disabled || loading;
  const isNative = as === "button";
  const Tag = as;

  return (
    <Tag
      {...(isNative ? { type, disabled: isInert } : {})}
      aria-disabled={isNative ? undefined : isInert || undefined}
      aria-busy={loading || undefined}
      className={`${buttonVariants[variant] ?? buttonVariants.primary} ${
        buttonSizes[size]
      } ${className}`}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Tag>
  );
}

export function Card({ children, className = "", interactive = true, as = "div", ...props }) {
  const MotionTag = motion[as] ?? motion.div;
  const reduced = useReducedMotion();

  return (
    <MotionTag
      initial={reduced ? { opacity: 1 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE.out }}
      whileHover={interactive && !reduced ? { y: -4 } : undefined}
      className={`${interactive ? "card" : "surface"} ${className}`}
      {...props}
    >
      {children}
    </MotionTag>
  );
}
