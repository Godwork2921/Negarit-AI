"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { registerUser } from "../../lib/auth";
import { initializeGoogleAuth, renderGoogleSignInButton } from "../../lib/google-auth";
import { useLanguage } from "../../contexts/LanguageContext";
import { EASE } from "../../lib/animations";

const PERKS = ["perk1", "perk2", "perk3"];

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    initializeGoogleAuth()
      .then(() => {
        renderGoogleSignInButton("google-signin-button");
        setGoogleReady(true);
      })
      .catch((err) => console.warn("Google Auth unavailable:", err.message));

    const handleGoogleSuccess = (event) => {
      if (event.detail?.token) router.push("/dashboard");
    };
    window.addEventListener("google-signin-success", handleGoogleSuccess);
    return () => window.removeEventListener("google-signin-success", handleGoogleSuccess);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    try {
      await registerUser(name, email, password);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Register error:", err);
      setError(
        err.message === "Failed to fetch" || err.message?.includes("fetch")
          ? t("serverError")
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const rise = (delay = 0) => ({
    initial: reduced ? { opacity: 1 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: EASE.out },
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand panel ── */}
      <aside className="relative hidden overflow-hidden bg-[var(--surface)] p-12 lg:flex lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="surface-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        />
        <motion.div
          aria-hidden="true"
          className="glow-orb -left-24 top-[12%] size-[28rem] opacity-60"
          animate={reduced ? undefined : { y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="glow-orb -right-24 bottom-[12%] size-[24rem] opacity-45"
          animate={reduced ? undefined : { y: [0, 26, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative">
          <motion.div {...rise(0)} className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl2 bg-brand-gradient shadow-[var(--shadow-brand)]">
              <svg
                className="size-6 text-[var(--text-inverse)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span className="text-lg font-bold tracking-tight text-ink">
              Negarit<span className="text-primary">AI</span>
            </span>
          </motion.div>

          <motion.h1
            {...rise(0.08)}
            className="mt-10 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink xl:text-5xl"
          >
            {t("secureDigitalFuture")}
          </motion.h1>

          <motion.p {...rise(0.16)} className="mt-5 max-w-md text-base leading-relaxed text-muted">
            {t("createAccountDesc")}
          </motion.p>

          <motion.ul {...rise(0.24)} className="mt-8 space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm text-muted">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-success-soft text-success">
                  <svg
                    className="size-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                {t(perk)}
              </li>
            ))}
          </motion.ul>

          <motion.p {...rise(0.32)} className="mt-9 text-sm text-subtle">
            {t("trustedBy10k")}
          </motion.p>
        </div>
      </aside>

      {/* ── Form panel ── */}
      <main className="flex items-center justify-center px-6 py-14 sm:px-10">
        <motion.div
          initial={reduced ? { opacity: 1 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE.out }}
          className="w-full max-w-sm"
        >
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient">
              <svg
                className="size-5 text-[var(--text-inverse)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-ink">
              Negarit<span className="text-primary">AI</span>
            </span>
          </Link>

          <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t("createAccount")}</h2>
          <p className="mt-1.5 text-sm text-muted">{t("fillDetails")}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-[var(--danger)]/30 bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink">
                {t("fullName")}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder={t("namePlaceholder")}
                autoComplete="name"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
                {t("emailAddress")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                required
                className="input-field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
                  {t("password")}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-ink">
                  {t("confirmPassword")}
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <>
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                  {t("creatingAccount")}
                </>
              ) : (
                t("signUp")
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-subtle">
              {t("orContinueWith")}
            </span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <div id="google-signin-button" className="flex min-h-[40px] justify-center" />

          {!googleReady ? (
            <p className="mt-2 text-center text-xs text-subtle">{t("googleAuthInfo")}</p>
          ) : null}

          <p className="mt-8 text-center text-sm text-muted">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {t("signIn")}
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-subtle">{t("protectedByNegarit")}</p>
        </motion.div>
      </main>
    </div>
  );
}
