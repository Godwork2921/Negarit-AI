"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import { getUser, logout } from "../../lib/auth";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../contexts/LanguageContext";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleClearHistory = () => {
    if (confirm(t('clearHistoryConfirm'))) {
      localStorage.removeItem("analysisHistory");
      alert(t('historyCleared'));
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a1a] text-white">
      <Sidebar />
      <main className="flex-1 lg:ml-48 p-6 lg:p-10 space-y-8">
        <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
          {t('settings')}
        </motion.h1>

        {/* Profile */}
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-bold">{t('profile')}</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
              {user?.name?.[0] || "U"}
            </div>
            <div>
              <p className="font-semibold">{user?.name || "User"}</p>
              <p className="text-sm text-gray-500">{user?.email || t('notSignedIn')}</p>
            </div>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t('security')}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{t('authMethod')}</p>
                <p className="text-xs text-gray-500">{t('emailAndPassword')}</p>
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">{t('active')}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{t('sessionLabel')}</p>
                <p className="text-xs text-gray-500">{t('loggedInWithJwt')}</p>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                {t('signOut')}
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Data */}
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t('dataStorage')}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{t('analysisHistory')}</p>
                <p className="text-xs text-gray-500">{t('storedLocally')}</p>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleClearHistory} className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                {t('clearHistory')}
              </motion.button>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{t('appVersion')}</p>
                <p className="text-xs text-gray-500">{t('negaritAiVersion')}</p>
              </div>
              <span className="text-xs text-gray-500">{t('upToDate')}</span>
            </div>
          </div>
        </motion.section>

        {/* About */}
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-[#0f0f2a]/60 border border-white/5 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-bold">{t('about')}</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {t('aboutDescription')}
          </p>
          <p className="text-xs text-gray-600">
            {t('copyright').replace('{year}', new Date().getFullYear())}
          </p>
        </motion.section>
      </main>
    </div>
  );
}
