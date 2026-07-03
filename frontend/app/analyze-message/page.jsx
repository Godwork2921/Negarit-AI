"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { analyzeMessage, analyzeImage } from "../../lib/api";
import { useLanguage } from "../../contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" } }),
};

export default function AnalyzeMessagePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [message, setMessage] = useState(
    "URGENT: Your Microsoft 365 account will be suspended in 2 hours due to irregular activity. Please verify your identity immediately to prevent lockout.\nVerify here: https://m1crosoft-security.net/auth/login?token=abc"
  );
  const [senderEmail, setSenderEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeMessage(message, { senderEmail, domain, senderPhone });
      setResult(data);
      const history = JSON.parse(localStorage.getItem("analysisHistory") || "[]");
      history.unshift({ type: "message", input: message.slice(0, 100), ...data, id: Date.now() });
      localStorage.setItem("analysisHistory", JSON.stringify(history.slice(0, 20)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageRedirect = () => {
    router.push("/analyze-image");
  };

  const score = result?.riskScore ?? 0;
  const threatLabel = score < 30 ? t('lowRisk') : score < 60 ? "Suspicious" : t('highRisk');
  const threatColor = score < 30 ? "text-green-400" : score < 60 ? "text-yellow-400" : "text-red-400";
  const barColor = score < 30 ? "bg-green-500" : score < 60 ? "bg-yellow-500" : "bg-red-500";
  const barColorText = score < 30 ? "text-green-500" : score < 60 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="min-h-screen flex bg-[#0a0a1a] text-white">
      <Sidebar />
      <main className="flex-1 lg:ml-48 p-6 lg:p-10 space-y-8">
        <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
          {t('analyzeMessage')}
        </motion.h1>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#0f0f2a]/80 border border-white/5 rounded-xl p-6 space-y-4">
          {/* Sender Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('senderEmailOptional')}</label>
              <input
                type="email" value={senderEmail} placeholder={t('senderEmailPlaceholder')}
                onChange={(e) => { setSenderEmail(e.target.value); setResult(null); }}
                className="w-full bg-[#0a0a1a] border border-white/10 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('domainOptional')}</label>
              <input
                type="text" value={domain} placeholder={t('domainPlaceholder')}
                onChange={(e) => { setDomain(e.target.value); setResult(null); }}
                className="w-full bg-[#0a0a1a] border border-white/10 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('senderPhoneOptional')}</label>
              <input
                type="text" value={senderPhone} placeholder={t('senderPhonePlaceholder')}
                onChange={(e) => { setSenderPhone(e.target.value); setResult(null); }}
                className="w-full bg-[#0a0a1a] border border-white/10 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm placeholder-gray-600"
              />
            </div>
          </div>
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); setResult(null); }}
            rows={6}
            placeholder={t('messagePlaceholder')}
            className="w-full bg-[#0a0a1a] border border-white/10 text-white p-4 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm placeholder-gray-500"
          />
          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={loading || !message.trim()}
              className="bg-purple-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('analyzingButton')}
                </span>
              ) : t('analyzeContent')}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleImageRedirect}
              className="bg-[#1a1a3a] border border-white/10 px-6 py-2.5 rounded-lg font-semibold hover:bg-[#222250] transition-colors"
            >
              {t('uploadScreenshot')}
            </motion.button>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#0f0f2a]/80 border border-white/5 rounded-xl p-10 flex flex-col items-center justify-center gap-4">
              <motion.div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              <p className="text-sm text-gray-400">{t('aiAnalyzingMessage')}</p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f0f2a]/80 border border-white/5 rounded-xl p-6 space-y-6">
              {/* Score bar */}
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-bold">{t('analysisComplete')}</h2>
                  <span className={`text-lg font-bold ${threatColor}`}>{threatLabel} — {score}/100</span>
                </div>
                <div className="w-full h-2 bg-[#1a1a3a] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </motion.div>

              {/* Explanation */}
              {result.explanation && (
                <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                  <p className="text-gray-300 leading-relaxed">{result.explanation}</p>
                </motion.div>
              )}

              {/* Verdict */}
              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold ${
                  result.verdict === "Safe" ? "text-green-400 border-green-500/30 bg-green-500/10"
                  : result.verdict === "Suspicious" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
                  : "text-red-400 border-red-500/30 bg-red-500/10"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    result.verdict === "Safe" ? "bg-green-500"
                    : result.verdict === "Suspicious" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  {result.verdict || "Unknown"}
                </div>
              </motion.div>

              {/* Flags */}
              {result.flags?.length > 0 && (
                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                  <h3 className="text-lg font-semibold mb-2">{t('detectedFlags')}</h3>
                  <ul className="space-y-1.5">
                    {result.flags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Sender Analysis */}
              {result.senderAnalysis && (
                <motion.div custom={3.5} variants={fadeUp} initial="hidden" animate="visible" className="bg-[#0a0a1a] border border-white/5 rounded-xl p-5 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    {t('senderAnalysisTitle')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {result.senderAnalysis.senderVerdict && (
                      <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{t('senderVerdict')}</p>
                        <span className={`text-sm font-bold ${
                          result.senderAnalysis.senderVerdict === "Safe" ? "text-green-400"
                          : result.senderAnalysis.senderVerdict === "Suspicious" ? "text-yellow-400"
                          : "text-red-400"
                        }`}>{result.senderAnalysis.senderVerdict}</span>
                      </div>
                    )}
                    {result.senderAnalysis.emailReputation && (
                      <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{t('emailReputation')}</p>
                        <span className={`text-sm font-bold capitalize ${
                          result.senderAnalysis.emailReputation === "legitimate" ? "text-green-400"
                          : result.senderAnalysis.emailReputation === "suspicious" ? "text-yellow-400"
                          : "text-red-400"
                        }`}>{result.senderAnalysis.emailReputation}</span>
                      </div>
                    )}
                    {result.senderAnalysis.domainReputation && (
                      <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{t('domainReputation')}</p>
                        <span className={`text-sm font-bold capitalize ${
                          result.senderAnalysis.domainReputation === "trusted" ? "text-green-400"
                          : result.senderAnalysis.domainReputation === "suspicious" ? "text-yellow-400"
                          : "text-red-400"
                        }`}>{result.senderAnalysis.domainReputation}</span>
                      </div>
                    )}
                    {result.senderAnalysis.phoneReputation && (
                      <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">{t('phoneReputation')}</p>
                        <span className={`text-sm font-bold capitalize ${
                          result.senderAnalysis.phoneReputation === "legitimate" ? "text-green-400"
                          : "text-yellow-400"
                        }`}>{result.senderAnalysis.phoneReputation}</span>
                      </div>
                    )}
                  </div>
                  {result.senderAnalysis.details && (
                    <p className="text-sm text-gray-400">{result.senderAnalysis.details}</p>
                  )}
                </motion.div>
              )}

              {/* Actions */}
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                  className="bg-[#1a1a3a] border border-white/10 px-6 py-2.5 rounded-lg font-semibold hover:bg-[#222250] transition-colors"
                >
                  {t('copyReport')}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
