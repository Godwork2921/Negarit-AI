"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import { useStoredJSON } from "../lib/store";
import { USER_STORAGE_KEY } from "../lib/constants";
import { useLanguage } from "../contexts/LanguageContext";
import { SPRING } from "../lib/animations";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { t } = useLanguage();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/analyze-message", label: t("navAnalyze") },
    { href: "#features", label: t("navFeatures") },
    { href: "#workflow", label: t("navHowItWorks") },
    { href: "#faq", label: t("navFaq") },
  ];

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user] = useStoredJSON(USER_STORAGE_KEY, null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  // Close the mobile sheet when the viewport grows past the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e) => e.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.push("/");
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? "border-b border-[var(--border)] bg-[var(--surface-overlay)] shadow-[var(--shadow-md)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 md:h-[4.5rem] md:px-8"
      >
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-2.5" aria-label="NegaritAI home">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-gradient shadow-[var(--shadow-brand)] transition-transform duration-300 group-hover:scale-105">
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
          <span className="text-lg font-bold tracking-tight text-ink">
            Negarit<span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group relative block rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
              >
                {l.label}
                <span className="pointer-events-none absolute inset-x-3.5 -bottom-0.5 h-px scale-x-0 bg-brand-gradient transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <span className="flex items-center gap-2.5 rounded-full border border-[var(--border)] py-1 pl-1 pr-3.5">
                <span className="grid size-7 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-[var(--text-inverse)]">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
                <span className="max-w-[10ch] truncate text-sm font-medium text-ink">
                  {user.name}
                </span>
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition-colors duration-200 hover:text-danger"
              >
                {t("logOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
              >
                {t("logIn")}
              </Link>
              <Link href="/register" className="btn-primary px-5 py-2.5 text-sm">
                {t("startFreeTrial")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="grid size-10 place-items-center rounded-xl border border-[var(--border)] text-ink transition-colors duration-200 hover:bg-[var(--border)] md:hidden"
        >
          <span className="relative block h-3.5 w-4">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute left-0 block h-0.5 w-full rounded-full bg-current"
                animate={
                  open
                    ? i === 0
                      ? { top: 6, rotate: 45 }
                      : i === 1
                        ? { top: 6, opacity: 0 }
                        : { top: 6, rotate: -45 }
                    : { top: i === 0 ? 0 : i === 1 ? 6 : 12, rotate: 0, opacity: 1 }
                }
                transition={SPRING.snappy}
              />
            ))}
          </span>
        </button>
      </nav>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 -z-10 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              id="mobile-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-[var(--border)] bg-[var(--surface-overlay)] backdrop-blur-xl md:hidden"
            >
              <div className="mx-auto w-full max-w-7xl space-y-1 px-6 py-5">
                {links.map((l, i) => (
                  <motion.div
                    key={l.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.045, duration: 0.3 }}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-base font-medium text-muted transition-colors duration-200 hover:bg-[var(--border)] hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}

                <div className="!my-4 h-px bg-[var(--border)]" />

                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <span className="grid size-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-[var(--text-inverse)]">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                        <p className="truncate text-xs text-subtle">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors duration-200 hover:bg-danger-soft"
                    >
                      {t("logOut")}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="btn-secondary w-full"
                    >
                      {t("logIn")}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="btn-primary w-full"
                    >
                      {t("startFreeTrial")}
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
