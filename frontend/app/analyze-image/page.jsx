"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import { analyzeImage } from "../../lib/api";
import { useLanguage } from "../../contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" } }),
};

export default function AnalyzeImagePage() {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setResult(null); setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setBase64(reader.result.split(",")[1]);
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!base64) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await analyzeImage(base64);
      setResult(data);
      const history = JSON.parse(localStorage.getItem("analysisHistory") || "[]");
      history.unshift({ type: "image", input: fileName || "Image upload", ...data, id: Date.now() });
      localStorage.setItem("analysisHistory", JSON.stringify(history.slice(0, 20)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const score = result?.riskScore ?? 0;
  const authenticityScore = 100 - score;

  return (
    <div className="min-h-screen flex bg-[#0a0a1a] text-white">
      <Sidebar />
      <main className="flex-1 lg:ml-48 p-6 lg:p-10 space-y-8">
        <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold bg-gradient-to-r from-purple-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
          {t('imageDeepfakeAnalysis')}
        </motion.h1>

        {/* Upload */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="bg-[#0f0f2a]/80 border-2 border-dashed border-white/10 hover:border-purple-500/30 transition-colors rounded-xl p-8 text-center cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <div className="flex flex-col items-center gap-3">
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain" />
              <p className="text-sm text-gray-400">{fileName}</p>
            </div>
          ) : (
            <div>
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 mb-1">{t('dropImageHere')}</p>
              <p className="text-sm text-gray-500">{t('maxSizeFormats')}</p>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {!preview && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="mt-4 bg-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              {t('uploadImage')}
            </motion.button>
          )}
        </motion.div>

        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        {preview && !loading && !result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAnalyze} className="bg-purple-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
              {t('analyzeImageBtn')}
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setPreview(null); setBase64(""); setResult(null); setFileName(""); }} className="bg-[#1a1a3a] border border-white/10 px-6 py-2.5 rounded-lg font-semibold hover:bg-[#222250] transition-colors">
              {t('remove')}
            </motion.button>
          </motion.div>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[#0f0f2a]/80 border border-white/5 rounded-xl p-10 flex flex-col items-center justify-center gap-4">
              <motion.div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
              <p className="text-sm text-gray-400">{t('analyzingImage')}</p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0f0f2a]/80 border border-white/5 rounded-xl p-6 space-y-6">
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <h2 className="text-2xl font-bold mb-1">{t('analysisResultsId')}{String(Date.now()).slice(-4)}</h2>
              </motion.div>

              {/* Source Image */}
              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                <h3 className="text-lg font-semibold mb-2">{t('sourceImage')}</h3>
                <div className="w-40 h-28 bg-[#1a1a3a] rounded-lg flex items-center justify-center text-gray-500 border border-white/5 overflow-hidden">
                  {preview ? <img src={preview} className="w-full h-full object-cover" /> : <span>[Preview]</span>}
                </div>
              </motion.div>

              {/* Deepfake Probability */}
              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                <h3 className="text-lg font-semibold mb-2">{t('deepfakeProbability')}</h3>
                <p className="text-red-400 font-bold">{score}% — {score < 30 ? t('lowLikelihood') : score < 60 ? t('possibleAiGeneration') : t('highLikelihood')}</p>
              </motion.div>

              {/* Logo Detection */}
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                <h3 className="text-lg font-semibold mb-2">{t('logoDetection')}</h3>
                <p className="text-gray-300">
                  {result.verdict === "Authentic" ? t('noAiLogosDetected') : "Adobe Photoshop / Generative AI tooling detected — "}
                  {result.verdict !== "Authentic" && <span className="text-purple-400">{score}% {t('confidenceScore')}</span>}
                </p>
              </motion.div>

              {/* Image Authenticity */}
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
                <h3 className="text-lg font-semibold mb-2">{t('imageAuthenticity')}</h3>
                <p className="text-red-400 font-bold">{authenticityScore}/100 — {authenticityScore < 30 ? t('failedVerification') : authenticityScore < 60 ? t('partialVerification') : t('passedVerification')}</p>
              </motion.div>

              {/* Forgery Detection */}
              <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
                <h3 className="text-lg font-semibold mb-2">{t('forgeryDetection')}</h3>
                <p className={`font-semibold ${score >= 50 ? "text-red-500" : "text-green-400"}`}>
                  {score >= 50 ? t('forgeryThreat') : t('forgeryClear')}
                </p>
              </motion.div>

              {/* AI Recommendation */}
              <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
                <h3 className="text-lg font-semibold mb-2">{t('aiRecommendation')}</h3>
                <span className={`inline-block font-semibold px-4 py-2 rounded-lg ${
                  score >= 50 ? "bg-red-700 text-white" : "bg-green-700 text-white"
                }`}>
                  {score >= 50 ? t('blockRecommendation') : t('allowRecommendation')}
                </span>
              </motion.div>

              {/* Extracted Text (OCR) */}
              {(result.explanation || result.flags?.length > 0) && (
                <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible">
                  <h3 className="text-lg font-semibold mb-2">{t('analysisDetails')}</h3>
                  <div className="bg-[#1a1a3a] border border-white/5 p-4 rounded-lg text-gray-300 text-sm font-mono leading-relaxed">
                    {result.explanation && <p className="mb-2">{result.explanation}</p>}
                    {result.flags?.length > 0 && (
                      <ul className="space-y-1">
                        {result.flags.map((f, i) => (
                          <li key={i} className="text-red-400">⚠ {f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap gap-3 pt-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))} className="bg-[#1a1a3a] border border-white/10 px-6 py-2.5 rounded-lg font-semibold hover:bg-[#222250] transition-colors">
                  {t('copyReport')}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-purple-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                  {t('downloadPdf')}
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
