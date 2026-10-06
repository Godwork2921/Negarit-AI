"use client";

import { createContext, useCallback, useContext, useEffect } from "react";
import { useMediaQuery, useStoredString } from "../lib/store";

const ThemeContext = createContext(null);

export const THEME_STORAGE_KEY = "theme";

function isTheme(value) {
  return value === "light" || value === "dark";
}

/**
 * Theme is *derived*, never copied into state:
 *   stored choice → OS preference → dark.
 *
 * Persisting on every change (the previous approach) froze the OS preference
 * after the first paint, so "follow the system" silently stopped working.
 * We only write to storage when the user actually makes a choice.
 */
export function ThemeProvider({ children }) {
  const prefersLight = useMediaQuery("(prefers-color-scheme: light)");
  const [stored, setStored] = useStoredString(THEME_STORAGE_KEY, "");

  const theme = isTheme(stored) ? stored : prefersLight ? "light" : "dark";

  // External system: keep the document in sync with the derived value.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback(
    (next) => setStored(isTheme(next) ? next : ""),
    [setStored]
  );

  const toggleTheme = useCallback(
    () => setStored(theme === "dark" ? "light" : "dark"),
    [setStored, theme]
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
