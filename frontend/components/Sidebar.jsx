"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../lib/auth";
import { useStoredJSON } from "../lib/store";
import { USER_STORAGE_KEY } from "../lib/constants";
import { useLanguage } from "../contexts/LanguageContext";
import { SPRING } from "../lib/animations";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    key: "dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    href: "/analyze-message",
    key: "analyzeMessage",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    href: "/analyze-image",
    key: "imageAnalysis",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    href: "/threat-history",
    key: "threatHistory",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    href: "/reports",
    key: "reports",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    href: "/library",
    key: "library",
    icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
  {
    href: "/settings",
    key: "settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
  {
    href: "/help",
    key: "help",
    icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [user] = useStoredJSON(USER_STORAGE_KEY, null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer on navigation: adjust state during render rather than
  // in an effect (react.dev/learn/you-might-not-need-an-effect).
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const renderSidebar = (layoutId) => (
    <div className="flex h-full flex-col">
      {/* Brand + toggles */}
      <div className="flex items-center justify-between gap-2 px-5 pb-5 pt-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient">
            <svg
              className="size-[18px] text-[var(--text-inverse)]"
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

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      {/* Nav */}
      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active ? "text-primary" : "text-muted hover:bg-[var(--border)] hover:text-ink"
              }`}
            >
              {/* Sliding active pill */}
              {active ? (
                <motion.span
                  layoutId={`sidebar-active-${layoutId}`}
                  transition={SPRING.smooth}
                  className="absolute inset-0 -z-10 rounded-xl bg-[var(--primary-soft)] ring-1 ring-inset ring-[var(--border-accent)]"
                />
              ) : null}

              <svg
                className={`size-5 shrink-0 transition-colors duration-200 ${
                  active ? "text-primary" : "text-subtle group-hover:text-ink"
                }`}
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
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Account */}
      <div className="border-t border-[var(--border)] p-3">
        {user ? (
          <div className="space-y-1">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-[var(--text-inverse)]">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-subtle">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:bg-danger-soft hover:text-danger"
            >
              <svg
                className="size-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t("logOut")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href="/login" className="btn-secondary w-full py-2 text-sm">
              {t("logIn")}
            </Link>
            <Link href="/register" className="btn-primary w-full py-2 text-sm">
              {t("signUp")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-overlay)] px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          className="grid size-9 place-items-center rounded-lg border border-[var(--border)] text-ink transition-colors duration-200 hover:bg-[var(--border)]"
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-bold tracking-tight text-ink">
          Negarit<span className="text-primary">AI</span>
        </span>
      </div>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        {renderSidebar("rail")}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={reduced ? { x: -288 } : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduced ? { x: -288 } : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 w-72 border-r border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg text-subtle transition-colors duration-200 hover:bg-[var(--border)] hover:text-ink"
              >
                <svg
                  className="size-4"
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
              {renderSidebar("drawer")}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
