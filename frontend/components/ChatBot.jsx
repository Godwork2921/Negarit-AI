"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../lib/constants";
import { EASE, SPRING } from "../lib/animations";
import { useLanguage } from "../contexts/LanguageContext";

const WELCOME = {
  english:
    "Hi! I'm Negarit AI Assistant. Ask me about phishing, cybersecurity, or what Negarit AI can do for you.",
  amharic:
    "ሰላም! እኔ የኔጋሪት ኤአይ ረዳት ነኝ። ስለ ማጭበርበር፣ የሳይበር ደህንነት ወይም ኔጋሪት ኤአይ ምን ማድረግ እንደሚችል ጠይቀኝ።",
  tigray:
    "ሰላም! ኣነ ናይ ኔጋሪት ኤአይ ሓጋዚ እየ። ብዛዕባ ምጥባር፣ ሳይበር ደህንነት ወይ ኔጋሪት ኤአይ እንታይ ክገብር ከም ዝኽእል ሓተተኒ።",
  oromo:
    "Akkam! Ani gargaaraa Negarit AI ti. Waa'ee phishining, ofeeggannoo saayibarii, ykn wanta Negarit AI siif hojjechuu danda'u na gaafadhu.",
};

const LANGUAGES = [
  { code: "english", label: "English", flag: "🇬🇧" },
  { code: "amharic", label: "አማርኛ", flag: "🇪🇹" },
  { code: "tigray", label: "ትግርኛ", flag: "🇪🇹" },
  { code: "oromo", label: "Afaan Oromoo", flag: "🇪🇹" },
];

export default function ChatBot() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("english");
  const [messages, setMessages] = useState([{ role: "bot", text: WELCOME.english }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // A untouched thread shows the greeting in the currently selected language;
  // derive it instead of rewriting state when `lang` changes.
  const visibleMessages =
    messages.length === 1 && messages[0].role === "bot"
      ? [{ role: "bot", text: WELCOME[lang] || WELCOME.english }]
      : messages;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    const history = messages
      .filter((m) => m.text)
      .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", text: m.text }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, language: lang, history }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply || t("sorryCouldNotProcess") },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: t("networkErrorChat") }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Toggle */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("close") : t("aiAssistant")}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-[60] grid size-14 place-items-center rounded-full bg-brand-gradient text-[var(--text-inverse)] shadow-[var(--shadow-brand)]"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.94 }}
        transition={SPRING.snappy}
      >
        {open ? (
          <svg
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open ? (
          <motion.section
            aria-label={t("aiAssistant")}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.24, ease: EASE.out }}
            className="fixed bottom-0 right-0 z-[55] flex h-[100dvh] w-full flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:bottom-6 sm:right-6 sm:h-[32rem] sm:w-[23rem] sm:rounded-3xl sm:border"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 bg-brand-gradient px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-extrabold text-white">
                  N
                </span>
                <span className="truncate text-sm font-bold text-white">{t("aiAssistant")}</span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  aria-label={t("language")}
                  className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold text-white outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-[var(--surface)] text-ink">
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
                <motion.button
                  type="button"
                  onClick={() => setOpen(false)}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t("close")}
                  className="grid size-7 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {visibleMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-br-sm bg-brand-gradient font-medium text-[var(--text-inverse)]"
                        : "rounded-bl-sm bg-[var(--surface-2)] text-muted"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-[var(--surface-2)] px-4 py-3">
                    <span className="flex gap-1.5" aria-hidden="true">
                      <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                      <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-[var(--border)] p-3">
              <div className="flex gap-2">
                <label htmlFor="chat-input" className="sr-only">
                  {t("askAboutCybersecurity")}
                </label>
                <input
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t("askAboutCybersecurity")}
                  className="input-field flex-1 px-3 py-2.5"
                />
                <motion.button
                  type="button"
                  onClick={send}
                  whileTap={{ scale: 0.94 }}
                  transition={SPRING.snappy}
                  disabled={loading || !input.trim()}
                  aria-label={t("send") || "Send"}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-[var(--text-inverse)] transition-opacity disabled:opacity-40"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </>
  );
}
