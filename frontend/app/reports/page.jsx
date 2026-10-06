"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import { Button } from "../../components/UI";
import { EASE } from "../../lib/animations";
import { useStoredJSON } from "../../lib/store";
import { USER_STORAGE_KEY } from "../../lib/constants";
import { useLanguage } from "../../contexts/LanguageContext";

function Stat({ label, value, tone }) {
  return (
    <div className="card p-5">
      <p
        className={`text-2xl font-extrabold tabular-nums ${tone ?? "text-ink"}`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-subtle">{label}</p>
    </div>
  );
}

function scoreTone(score) {
  if (score >= 60) return "text-danger";
  if (score >= 30) return "text-warning";
  return "text-success";
}

function verdictTone(verdict) {
  if (verdict === "Safe" || verdict === "Authentic") return "bg-success-soft text-success";
  if (verdict === "Suspicious" || verdict === "Likely AI-Generated") {
    return "bg-warning-soft text-warning";
  }
  return "bg-danger-soft text-danger";
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [history] = useStoredJSON("analysisHistory", []);
  const [user] = useStoredJSON(USER_STORAGE_KEY, null);

  const total = history.length;
  const threats = history.filter((x) => x.riskScore >= 60).length;
  const safe = history.filter((x) => x.riskScore < 30).length;
  const suspicious = history.filter((x) => x.riskScore >= 30 && x.riskScore < 60).length;

  const download = (contents, extension, mime) => {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negarit-report-${new Date().toISOString().split("T")[0]}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = `${t("date")},${t("type")},${t("content")},Risk Score,${t("verdict")},Flags\n`;
    const rows = history
      .map((item) => {
        const date = item.id ? new Date(item.id).toLocaleDateString() : "N/A";
        const content = (item.input || "").replace(/"/g, '""');
        const flags = (item.flags || []).join("; ").replace(/"/g, '""');
        return `"${date}","${item.type || "unknown"}","${content}","${item.riskScore ?? 0}","${item.verdict || "N/A"}","${flags}"`;
      })
      .join("\n");
    download(headers + rows, "csv", "text/csv");
  };

  const exportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      user: user?.name || "User",
      summary: { total, threats, safe, suspicious },
      analyses: history,
    };
    download(JSON.stringify(report, null, 2), "json", "application/json");
  };

  const empty = total === 0;

  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop />

      <main className="relative z-10 mx-auto max-w-6xl space-y-7 px-6 pb-20 pt-20 lg:ml-64 lg:pt-12">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out }}
          className="flex flex-wrap items-end justify-between gap-5"
        >
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
              {t("reports")}
            </h1>
            <p className="mt-1.5 text-sm text-muted">{t("exportDetailedReports")}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={exportCSV} disabled={empty}>
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {t("exportCsv")}
            </Button>
            <Button onClick={exportJSON} disabled={empty}>
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {t("exportJson")}
            </Button>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: EASE.out }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          <Stat label={t("totalAnalyses")} value={total} />
          <Stat label={t("threatsDetected")} value={threats} tone="text-danger" />
          <Stat label={t("safe")} value={safe} tone="text-success" />
          <Stat label={t("suspicious")} value={suspicious} tone="text-warning" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: EASE.out }}
          className="card overflow-hidden"
        >
          {empty ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <span className="grid size-16 place-items-center rounded-3xl bg-[var(--surface-2)] text-subtle">
                <svg
                  className="size-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </span>
              <p className="mt-4 text-sm font-medium text-muted">{t("noHistoryYet")}</p>
              <p className="mt-1 max-w-xs text-xs text-subtle">{t("runAnalysisReports")}</p>
              <Link href="/analyze" className="btn-secondary mt-6 px-5 py-2.5 text-sm">
                {t("threatAnalysis")}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    {[t("type"), t("content"), t("scoreLabel"), t("verdict"), t("date")].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-subtle"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium capitalize text-ink">
                        {item.type || t("unknown")}
                      </td>
                      <td className="max-w-[16rem] truncate px-5 py-3.5 text-muted">
                        {item.input || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`font-bold tabular-nums ${scoreTone(item.riskScore ?? 0)}`}
                        >
                          {item.riskScore ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${verdictTone(item.verdict)}`}
                        >
                          {item.verdict || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-subtle">
                        {item.id ? new Date(item.id).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}