"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getUser } from "../../lib/auth";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { useLanguage } from "../../contexts/LanguageContext";

function StatCard({ label, value, icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
    >
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d={icon} />
        </svg>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, threats: 0, safe: 0, suspicious: 0 });

  const quickLinks = [
    { href: "/analyze", label: "Analyze Message", desc: t('detectPhishing'), icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "from-indigo-500 to-blue-600" },
    { href: "/analyze?tab=url", label: t('checkUrl'), desc: t('scanLinks'), icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", color: "from-purple-500 to-pink-600" },
    { href: "/analyze?tab=image", label: "Analyze Image", desc: t('detectDeepfakes'), icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", color: "from-green-500 to-teal-600" },
  ];

  useEffect(() => {
    setUser(getUser());
    const saved = localStorage.getItem("analysisHistory");
    if (saved) {
      const h = JSON.parse(saved);
      setHistory(h);
      setStats({
        total: h.length,
        threats: h.filter((x) => x.riskScore >= 60).length,
        safe: h.filter((x) => x.riskScore < 30).length,
        suspicious: h.filter((x) => x.riskScore >= 30 && x.riskScore < 60).length,
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Sidebar />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 lg:ml-48 max-w-7xl mx-auto px-6 pt-20 lg:pt-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="text-gray-300">{t('welcomeBack')}</span>{" "}
            <span className="bg-gradient-to-r from-gray-400 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {user?.name || "User"}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">{t('securityCommandCenter')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label={t('totalAnalyses')} value={stats.total} color="bg-indigo-600/20" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          <StatCard label={t('threatsDetected')} value={stats.threats} color="bg-red-600/20" icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          <StatCard label={t('safe')} value={stats.safe} color="bg-green-600/20" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          <StatCard label={t('suspicious')} value={stats.suspicious} color="bg-yellow-600/20" icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {t('quickActions')}
            </motion.h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {quickLinks.map((item, i) => (
                <motion.div key={item.href} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
                  <Link href={item.href} className="block p-4 rounded-xl border border-white/5 bg-[#0f0f2a]/40 hover:border-indigo-500/30 hover:bg-[#0f0f2a]/60 transition-all">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path d={item.icon} />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {t('recentActivity')}
            </motion.h2>
            <div className="bg-[#0f0f2a]/40 border border-white/5 rounded-xl p-5 min-h-[300px]">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                  <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs">{t('noAnalysesYet')}</p>
                  <Link href="/analyze" className="text-xs text-indigo-400 hover:text-indigo-300 mt-2">{t('runFirstScan')} →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 10).map((item) => {
                    const score = item.riskScore ?? 0;
                    const dotColor = score < 30 ? "bg-green-500" : score < 60 ? "bg-yellow-500" : "bg-red-500";
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                        <span className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 truncate">{item.input || "Image"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-500 uppercase">{item.type}</span>
                            <span className="text-[10px] text-gray-600">•</span>
                            <span className="text-[10px] text-gray-500">{t('scoreLabel')} {score}</span>
                            <span className="text-[10px] text-gray-600">•</span>
                            <span className="text-[10px] font-medium" style={{ color: score < 30 ? "#22c55e" : score < 60 ? "#eab308" : "#ef4444" }}>{item.verdict}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
