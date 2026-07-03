"use client";

import { motion } from "framer-motion";

export function LoadingSpinner({ size = "md", message = "Loading..." }) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin`} />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

export function Toast({ message, type = "info", onClose }) {
  const bgColor = {
    success: "bg-green-500/20 border-green-500/30 text-green-300",
    error: "bg-red-500/20 border-red-500/30 text-red-300",
    warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-300",
    info: "bg-indigo-500/20 border-indigo-500/30 text-indigo-300",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${bgColor[type]} border rounded-lg px-4 py-3 flex items-center justify-between gap-4 max-w-md`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-lg hover:opacity-70">
        ×
      </button>
    </motion.div>
  );
}

export function Badge({ label, type = "default", size = "md" }) {
  const typeClasses = {
    default: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    success: "bg-green-500/20 text-green-300 border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    danger: "bg-red-500/20 text-red-300 border-red-500/30",
    primary: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border font-semibold ${typeClasses[type]} ${sizeClasses[size]}`}>
      {label}
    </span>
  );
}

export function Alert({ title, message, type = "info", onClose }) {
  const colors = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    info: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
  };

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${colors[type]} border rounded-lg p-4 flex items-start gap-4`}
    >
      <span className="text-xl flex-shrink-0">{icons[type]}</span>
      <div className="flex-1">
        {title && <h3 className="font-semibold mb-1">{title}</h3>}
        {message && <p className="text-sm opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-xl hover:opacity-70 flex-shrink-0">
          ×
        </button>
      )}
    </motion.div>
  );
}

export function Button({ children, variant = "primary", size = "md", isLoading = false, disabled = false, ...props }) {
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40",
    secondary: "border border-white/20 hover:border-white/40 hover:bg-white/5",
    danger: "bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-lg shadow-red-600/25",
    ghost: "hover:bg-white/5",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      disabled={disabled || isLoading}
      className={`text-white font-semibold rounded-lg transition-all duration-300 ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      {...props}
    >
      {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </motion.button>
  );
}

export function Card({ children, className = "", ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl hover:border-white/20 transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
