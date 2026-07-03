"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import { getUser } from "../../lib/auth";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ReportsPage() {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
    const saved = localStorage.getItem("analysisHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const total = history.length;
  const threats = history.filter((x) => x.riskScore >= 60).length;
  const safe = history.filter((x) => x.riskScore < 30).length;
  const suspicious = history.filter((x) => x.riskScore >= 30 && x.riskScore < 60).length;

  const generateCSV = () => {
    const headers = `${t('date')},${t('type')},${t('content')},Risk Score,${t('verdict')},Flags\n`;
    const rows = history.map((item) => {
      const date = item.id ? new Date(item.id).toLocaleDateString() : "N/A";
      const content = (item.input || "").replace(/"/g, '""');
      const flags = (item.flags || []).join("; ").replace(/"/g, '""');
      return `"${date}","${item.type || "unknown"}","${content}","${item.riskScore ?? 0}","${item.verdict || "N/A"}","${flags}"`;
    }).join("\n");
    return headers + rows;
  };

  const exportCSV = () => {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negarit-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      user: user?.name || "User",
      summary: { total, threats, safe, suspicious },
      analyses: history,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `negarit-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a1a] text-white">
      <Sidebar />
      <main className="flex-1 lg:ml-48 p-6 lg:p-10 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-300 bg-clip-text text-transparent">{t('reports')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('exportDetailedReports')}</p>
          </div>
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportCSV} disabled={history.length === 0} className="bg-[#1a1a3a] border border-white/10 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#222250] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t('exportCsv')}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportJSON} disabled={history.length === 0} className="bg-purple-600 px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {t('exportJson')}
            </motion.button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-5">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('totalAnalyses')}</p>
          </div>
          <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-5">
            <p className="text-2xl font-bold text-red-400">{threats}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('threatsDetected')}</p>
          </div>
          <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-5">
            <p className="text-2xl font-bold text-green-400">{safe}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('safe')}</p>
          </div>
          <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-5">
            <p className="text-2xl font-bold text-yellow-400">{suspicious}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('suspicious')}</p>
          </div>
        </motion.div>

        {/* History Table */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm">{t('noHistoryYet')}</p>
              <p className="text-xs text-gray-700 mt-1">{t('runAnalysisReports')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0a0a1a] border-b border-white/5">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{t('type')}</th>
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{t('content')}</th>
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{t('scoreLabel')}</th>
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{t('verdict')}</th>
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 capitalize text-gray-300">{item.type || "unknown"}</td>
                      <td className="px-5 py-3 text-gray-400 max-w-[200px] truncate">{item.input || "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`font-medium ${
                          item.riskScore < 30 ? "text-green-400"
                          : item.riskScore < 60 ? "text-yellow-400"
                          : "text-red-400"
                        }`}>{item.riskScore ?? "—"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          item.verdict === "Safe" || item.verdict === "Authentic" ? "text-green-400 bg-green-500/10"
                          : item.verdict === "Suspicious" ? "text-yellow-400 bg-yellow-500/10"
                          : "text-red-400 bg-red-500/10"
                        }`}>{item.verdict || "—"}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
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
