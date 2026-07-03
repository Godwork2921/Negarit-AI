"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { loginUser } from "../../lib/auth";
import { initializeGoogleAuth, renderGoogleSignInButton } from "../../lib/google-auth";
import { useLanguage } from "../../contexts/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    setError("");
    try {
      await loginUser(email, password);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      if (err.message === "Failed to fetch" || err.message?.includes("fetch")) {
        setError(t('serverError'));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Panel */}
      <div className="bg-gradient-to-br from-blue-900 via-purple-800 to-blue-900 text-white flex flex-col justify-center px-12 py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 opacity-10">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="0.5" />
            <path d="M100 20v160M20 100h160" stroke="currentColor" strokeWidth="0.3" />
          </svg>
        </div>
        <motion.div
          className="absolute -bottom-8 -left-8 w-44 h-44 opacity-5"
          animate={{ y: [0, -8, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 80 100" fill="currentColor" className="w-full h-full">
            <rect x="15" y="45" width="50" height="50" rx="8" />
            <path d="M25 45V30a15 15 0 0130 0v15" stroke="currentColor" strokeWidth="6" fill="none" />
            <circle cx="40" cy="65" r="6" />
            <rect x="38" y="65" width="4" height="12" rx="2" />
          </svg>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold mb-4">{t('negaritAi')}</motion.h1>
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-extrabold mb-6">{t('commandCenter')}</motion.h2>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-gray-300 mb-8 max-w-md">{t('detectPhishingDeepfakes')}</motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex space-x-4 mb-8">
          <span className="bg-blue-700/80 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold">{t('accuracy994')}</span>
          <span className="bg-purple-700/80 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold">{t('zeroDayProtected')}</span>
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-gray-400">{t('joinOver10k')}</motion.p>
      </div>

      {/* Right Form */}
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white flex flex-col justify-center px-12 py-16">
        <h2 className="text-2xl font-bold mb-2">{t('welcomeBack')}</h2>
        <p className="text-gray-600 mb-6">{t('enterCredentials')}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && !error.includes("not configured") && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailAddress')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder={t('emailPlaceholder')}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <a href="#" className="text-sm text-purple-600 hover:underline mt-1 inline-block">{t('forgotPassword')}</a>
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02, boxShadow: "0 4px 20px rgba(147,51,234,0.35)" } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-60"
          >
            {loading ? t('signingIn') : t('signIn')}
          </motion.button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-gray-500">{t('orContinueWith')}</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div id="google-signin-button" className="flex justify-center min-h-[40px]"></div>

        {!googleReady && (
          <p className="text-center text-xs text-gray-400 mt-2">{t('googleAuthInfo')}</p>
        )}

        <p className="mt-6 text-gray-600 text-sm text-center">
          {t('dontHaveAccount')}{" "}
          <a href="/register" className="text-purple-600 hover:underline font-medium">{t('createAccount')}</a>
        </p>
        <p className="mt-2 text-gray-400 text-xs text-center">{t('protectedByNegarit')}</p>
      </motion.div>
    </div>
  );
}
