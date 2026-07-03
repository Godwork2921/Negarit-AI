"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import { useLanguage } from "../../contexts/LanguageContext";

export default function ThreatHistoryPage() {
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("analysisHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  return (
    <div className="min-h-screen flex bg-[#0a0a1a] text-white">
      <Sidebar />
      <main className="flex-1 lg:ml-48 p-6 lg:p-10 space-y-8">
        <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
          {t('threatHistory')}
        </motion.h1>

        {history.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0f0f2a]/40 border border-white/5 rounded-xl p-10 flex flex-col items-center justify-center text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{t('noThreatHistory')}</p>
            <p className="text-xs mt-1">{t('runAnalysisToSee')}</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f0f2a]/40 border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">{t('type')}</th>
                  <th className="text-left p-4 font-medium">{t('content')}</th>
                  <th className="text-left p-4 font-medium">{t('scoreLabel')}</th>
                  <th className="text-left p-4 font-medium">{t('verdict')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const score = item.riskScore ?? 0;
                  const dotColor = score < 30 ? "bg-green-500" : score < 60 ? "bg-yellow-500" : "bg-red-500";
                  const textColor = score < 30 ? "text-green-400" : score < 60 ? "text-yellow-400" : "text-red-400";
                  return (
                    <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="p-4">
                        <span className="text-gray-300 capitalize">{item.type || "unknown"}</span>
                      </td>
                      <td className="p-4 text-gray-400 max-w-[200px] truncate">{item.input || "—"}</td>
                      <td className="p-4">
                        <span className={`flex items-center gap-2 ${textColor}`}>
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          {score}
                        </span>
                      </td>
                      <td className="p-4 font-medium" style={{ color: score < 30 ? "#22c55e" : score < 60 ? "#eab308" : "#ef4444" }}>
                        {item.verdict || "—"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </main>
    </div>
  );
}
