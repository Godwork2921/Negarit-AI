"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser, logout, isAuthenticated } from "../lib/auth";
import { useLanguage } from "../contexts/LanguageContext";

export default function Navbar() {
  const { t } = useLanguage();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: t('dashboard') },
    { href: "/analyze-message", label: t('navAnalyze') },
    { href: "#features", label: t('navFeatures') },
    { href: "#workflow", label: t('navHowItWorks') },
    { href: "#faq", label: t('navFaq') },
  ];
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-indigo-600/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/">
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold gradient-text cursor-pointer"
          >
            NegaritAI
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <motion.ul
          className="hidden md:flex items-center gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {links.map((l, i) => (
            <motion.li key={i} variants={itemVariants}>
              <Link
                href={l.href}
                className="relative group text-gray-300 hover:text-white transition-colors font-medium"
              >
                {l.label}
                <motion.span
                  className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-400"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        {/* Auth Section */}
        <div className="hidden md:flex items-center gap-6">
          {user ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4"
            >
              <motion.span
                className="text-gray-300 text-sm flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
              >
                <motion.span
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold"
                  whileHover={{ scale: 1.1 }}
                >
                  {user.name?.charAt(0) || "U"}
                </motion.span>
                {user.name}
              </motion.span>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                {t('logOut')}
              </motion.button>
            </motion.div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-300 hover:text-white transition-colors font-medium"
              >
                {t('logIn')}
              </Link>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/register"
                  className="inline-block btn-primary"
                >
                  {t('startFreeTrial')}
                </Link>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <motion.button
          className="md:hidden text-white p-2"
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.95 }}
          aria-label={t('toggleMenu')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-[#0f0f2a]/95 backdrop-blur-xl border-t border-white/5"
          >
            <motion.div
              className="px-6 py-4 space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {links.map((l, i) => (
                <motion.div key={i} variants={itemVariants}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block text-gray-300 hover:text-white py-2 font-medium transition-colors"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.hr variants={itemVariants} className="border-white/10" />
              {user ? (
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-300 py-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.name?.charAt(0) || "U"}
                    </span>
                    {user.name}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setUser(null);
                      setOpen(false);
                      router.push("/");
                    }}
                    className="block w-full text-left text-gray-400 hover:text-white py-2 font-medium transition-colors"
                  >
                    {t('logOut')}
                  </button>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="space-y-3">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="block text-gray-300 hover:text-white py-2 font-medium transition-colors"
                  >
                    {t('logIn')}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="block text-center btn-primary w-full"
                  >
                    {t('startFreeTrial')}
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
