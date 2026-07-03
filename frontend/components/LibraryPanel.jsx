"use client";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { API_BASE_URL } from "../lib/constants";

export default function LibraryPanel({ articles, videos }) {
  const { t } = useLanguage();

  return (
    <div className="library-panel-root">
      <h2 className="section-title">{t("libraryTitle")}</h2>
      <p className="section-subtitle">{t("librarySub")}</p>

      <div className="library-grid">
        {articles.map((art, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="library-card"
          >
            <span className="library-category">{art.category}</span>
            <h3 className="library-card-title">{art.title}</h3>
            <p className="library-card-desc">{art.desc}</p>
            <div className="library-tips">
              <strong>{t("actionableTips")}</strong>
              <ul>
                {art.tips.map((tip, tIdx) => (
                  <li key={tIdx}>{tip}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      {/* DOCX Download */}
      <div style={{ marginTop: 40, marginBottom: 24 }}>
        <a href={`${API_BASE_URL}/api/library/download`} className="download-docx-btn">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {t("downloadGuide")}
        </a>
      </div>

      {/* Videos Section */}
      <div style={{ marginTop: 48, marginBottom: 24 }}>
        <h2 className="section-title">{t("videoTitle")}</h2>
        <p className="section-subtitle">{t("videoSub")}</p>

        <div className="video-grid">
          {videos.map((vid, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.06 }}
              className="video-card"
            >
              <div className="video-thumb-container" style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "12px" }}>
                <iframe
                  src={`https://www.youtube.com/embed/${vid.id}`}
                  title={vid.title}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="video-info">
                <h4 className="video-title">
                  <a href={vid.url} target="_blank" rel="noopener noreferrer">{vid.title}</a>
                </h4>
                <p className="video-channel">{vid.channel}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
