"use client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { analyzeMessage, checkUrl, analyzeImage } from "../../lib/api";
import Sidebar from "../../components/Sidebar";
import { useLanguage } from "../../contexts/LanguageContext";

const tabs = [
  { id: "message", label: "Message", desc: "Paste suspicious emails, SMS, or chat messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "from-indigo-500 to-blue-600" },
  { id: "url", label: "URL", desc: "Scan links for malware, phishing, and redirects", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", color: "from-purple-500 to-pink-600" },
  { id: "image", label: "Image", desc: "Upload screenshots to detect deepfakes and AI manipulation", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", color: "from-green-500 to-teal-600" },
];

function RiskMeter({ score }) {
  const { t } = useLanguage();
  const color = score < 30 ? "text-green-400" : score < 60 ? "text-yellow-400" : "text-red-400";
  const barColor = score < 30 ? "text-green-500" : score < 60 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
          <motion.circle
            cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray={97.4}
            initial={{ strokeDashoffset: 97.4 }}
            animate={{ strokeDashoffset: 97.4 - (score / 100) * 97.4 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={barColor}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{t('riskScore')}</span>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzePageContent />
    </Suspense>
  );
}

function AnalyzePageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("message");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tabs.find((t) => t.id === tab)) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const saved = localStorage.getItem("analysisHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (entry) => {
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("analysisHistory", JSON.stringify(updated));
  };

  const handleSubmit = async () => {
    if (!input) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let data;
      if (activeTab === "message") data = await analyzeMessage(input);
      else if (activeTab === "url") data = await checkUrl(input);
      else if (activeTab === "image") data = await analyzeImage(input);
      setResult(data);
      saveToHistory({ type: activeTab, input: input.slice(0, 100), ...data, id: Date.now() });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInput(reader.result.split(",")[1]);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const verdictColor = result?.verdict === "Safe" || result?.verdict === "Authentic"
    ? "text-green-400 border-green-500/30 bg-green-500/10"
    : result?.verdict === "Suspicious" || result?.verdict === "Likely AI-Generated"
    ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    : result?.verdict === "Danger" || result?.verdict === "Manipulated"
    ? "text-red-400 border-red-500/30 bg-red-500/10"
    : "text-gray-400 border-white/10 bg-white/5";

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <Sidebar />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 lg:ml-48 max-w-6xl mx-auto px-6 pt-20 lg:pt-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            {t('threatAnalysis')}
          </h1>
          <p className="text-gray-500 mt-1">{t('submitContent')}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left — Input */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Tab selector */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setResult(null); setError(""); setImagePreview(null); setInput(""); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d={tab.icon} />
                  </svg>
                  {tab.id === "message" ? t('messageTab') : tab.id === "url" ? t('urlTab') : t('imageTab')}
                </button>
              ))}
            </div>

            <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentTab?.color} flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path d={currentTab?.icon} />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold">{activeTab === "message" ? t('messageTab') : activeTab === "url" ? t('urlTab') : t('imageTab')} Analysis</h2>
                  <p className="text-xs text-gray-500">{activeTab === "message" ? t('messageTabDesc') : activeTab === "url" ? t('urlTabDesc') : t('imageTabDesc')}</p>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
                {activeTab === "image" ? (
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-colors bg-[#0a0a1a]">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full object-contain rounded-xl" />
                    ) : (
                      <div className="text-center text-gray-500">
                        <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm">{t('clickToUpload')}</span>
                        <p className="text-xs text-gray-600 mt-1">{t('pngJpgSupported')}</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={activeTab === "url" ? t('enterUrl') : t('pasteMessageHere')}
                    rows={8}
                    className="w-full bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none"
                  />
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                )}

                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={loading || !input}
                    whileHover={!loading && input ? { scale: 1.02 } : {}}
                    whileTap={!loading && input ? { scale: 0.98 } : {}}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('analyzingButton')}
                      </span>
                    ) : t('analyzeContent')}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => { setInput(""); setResult(null); setImagePreview(null); setError(""); }}
                    className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {t('clear')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Right — Results */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-[#0f0f2a]/60 border border-white/5 rounded-2xl p-6 min-h-[400px]">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">{t('results')}</h3>

              <AnimatePresence mode="wait">
                {!result && !error && !loading && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-64 text-gray-600">
                    <svg className="w-14 h-14 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-sm">{t('submitToSeeResults')}</p>
                    <p className="text-xs text-gray-600 mt-1">{t('aiWillReturn')}</p>
                  </motion.div>
                )}

                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-64 gap-4">
                    <motion.div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                    <div className="text-center">
                      <p className="text-sm text-white font-medium">{t('aiAnalyzing')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('checkingPatterns')}</p>
                    </div>
                  </motion.div>
                )}

                {result && !loading && (
                  <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-start gap-6">
                      <RiskMeter score={result.riskScore ?? 0} />
                      <div className="flex-1 space-y-3">
                        <div className={`inline-block text-base font-bold px-4 py-1.5 rounded-xl border ${verdictColor}`}>
                          {result.verdict || "Unknown"}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{result.explanation}</p>
                      </div>
                    </div>

                    {result.flags?.length > 0 && (
                      <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">{t('detectedFlags')}</p>
                        <div className="space-y-2">
                          {result.flags.map((f, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('analysisInfo')}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">{t('type')}</span>
                          <p className="text-gray-300 capitalize">{activeTab}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('verdict')}</span>
                          <p className="text-gray-300">{result.verdict}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
