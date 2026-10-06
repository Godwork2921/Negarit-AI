"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { Button } from "../../components/UI";
import { EASE } from "../../lib/animations";
import { logout } from "../../lib/auth";
import { useStoredJSON, writeStoredJSON } from "../../lib/store";
import { USER_STORAGE_KEY } from "../../lib/constants";
import { useLanguage } from "../../contexts/LanguageContext";

function Section({ title, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE.out }}
      className="card p-6"
    >
      <h2 className="mb-5 text-lg font-bold text-ink">{title}</h2>
      {children}
    </motion.section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3.5 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-subtle">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user] = useStoredJSON(USER_STORAGE_KEY, null);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleClearHistory = () => {
    if (confirm(t("clearHistoryConfirm"))) {
      writeStoredJSON("analysisHistory", null);
      alert(t("historyCleared"));
    }
  };

  const dangerButton =
    "rounded-lg bg-danger-soft px-3.5 py-1.5 text-xs font-bold text-danger transition-colors hover:bg-danger hover:text-[var(--text-inverse)]";

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop />

      <main className="relative z-10 mx-auto max-w-3xl space-y-6 px-6 pb-20 pt-20 lg:ml-64 lg:pt-12">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {t("settings")}
          </h1>
        </motion.header>

        <Section title={t("profile")} delay={0.06}>
          <div className="flex items-center gap-4">
            <span
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-xl font-extrabold text-[var(--text-inverse)]"
              aria-hidden="true"
            >
              {user?.name?.[0] || "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{user?.name || "User"}</p>
              <p className="truncate text-sm text-subtle">{user?.email || t("notSignedIn")}</p>
            </div>
          </div>
        </Section>

        <Section title={t("security")} delay={0.12}>
          <Row label={t("authMethod")} hint={t("emailAndPassword")}>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
              {t("active")}
            </span>
          </Row>
          <Row label={t("sessionLabel")} hint={t("loggedInWithJwt")}>
            <button type="button" onClick={handleLogout} className={dangerButton}>
              {t("signOut")}
            </button>
          </Row>
        </Section>

        <Section title={t("dataStorage")} delay={0.18}>
          <Row label={t("analysisHistory")} hint={t("storedLocally")}>
            <button type="button" onClick={handleClearHistory} className={dangerButton}>
              {t("clearHistory")}
            </button>
          </Row>
          <Row label={t("appVersion")} hint={t("negaritAiVersion")}>
            <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
              {t("upToDate")}
            </span>
          </Row>
        </Section>

        <Section title={t("about")} delay={0.24}>
          <p className="text-sm leading-relaxed text-muted">{t("aboutDescription")}</p>
          <p className="mt-3 text-xs text-subtle">
            {t("copyright").replace("{year}", new Date().getFullYear())}
          </p>
          <Button
            as="a"
            href="mailto:support@negarit-ai.com"
            variant="secondary"
            className="mt-5"
          >
            {t("contactSupport")}
          </Button>
        </Section>
      </main>
    </div>
  );
}