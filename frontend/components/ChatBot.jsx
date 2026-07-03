"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../lib/constants";
import { useLanguage } from "../contexts/LanguageContext";

const WELCOME = {
  english: "Hi! I'm Negarit AI Assistant. Ask me about phishing, cybersecurity, or what Negarit AI can do for you.",
  amharic: "ሰላም! እኔ የኔጋሪት ኤአይ ረዳት ነኝ። ስለ ማጭበርበር፣ የሳይበር ደህንነት ወይም ኔጋሪት ኤአይ ምን ማድረግ እንደሚችል ጠይቀኝ።",
  tigray: "ሰላም! ኣነ ናይ ኔጋሪት ኤአይ ሓጋዚ እየ። ብዛዕባ ምጥባር፣ ሳይበር ደህንነት ወይ ኔጋሪት ኤአይ እንታይ ክገብር ከም ዝኽእል ሓተተኒ።",
  oromo: "Akkam! Ani gargaaraa Negarit AI ti. Waa'ee phishining, ofeeggannoo saayibarii, ykn wanta Negarit AI siif hojjechuu danda'u na gaafadhu.",
};

export default function ChatBot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("english");
  const [messages, setMessages] = useState([{ role: "bot", text: WELCOME.english }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const LANGUAGES = [
    { code: "english", label: "English", flag: "🇬🇧" },
    { code: "amharic", label: "አማርኛ", flag: "🇪🇹" },
    { code: "tigray", label: "ትግርኛ", flag: "🇪🇹" },
    { code: "oromo", label: "Afaan Oromoo", flag: "🇪🇹" },
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "bot") {
      setMessages([{ role: "bot", text: WELCOME[lang] || WELCOME.english }]);
    }
  }, [lang]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, language: lang }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply || t('sorryCouldNotProcess') }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: t('networkErrorChat') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white hover:scale-105 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-0 right-0 z-50 w-1/4 h-screen bg-[#0f0f2a] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">N</div>
                <span className="font-semibold text-sm">{t('aiAssistant')}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Language selector */}
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/10 outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-[#0f0f2a]">{l.flag} {l.label}</option>
                  ))}
                </select>
                {/* Close button */}
                <motion.button
                  onClick={() => setOpen(false)}
                  whileTap={{ scale: 0.9 }}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-[#1a1a3a] text-gray-200 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a3a] rounded-xl rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/5 p-3 shrink-0">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('askAboutCybersecurity')}
                  className="flex-1 bg-[#0a0a1a] border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-600"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}