"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/**
 * Tiny reactive wrapper around `localStorage`.
 *
 * React's compiler rules (correctly) reject "read localStorage inside an
 * effect and setState" — it renders twice and can tear. `useSyncExternalStore`
 * is the sanctioned API: the first render on the server (and during
 * hydration) uses the fallback, then the client snapshot takes over.
 *
 * Snapshots are cached against the raw string so `getSnapshot` stays referentially
 * stable — React bails out of re-renders when nothing actually changed.
 */

const listeners = new Map();
const cache = new Map();

function readRaw(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse(raw, fallback) {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function snapshot(key, fallback) {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;

  const value = parse(raw, fallback);
  cache.set(key, { raw, value });
  return value;
}

function subscribe(key, onChange) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(onChange);

  const onStorage = (event) => {
    if (event.key === null || event.key === key) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    const group = listeners.get(key);
    if (group) {
      group.delete(onChange);
      if (group.size === 0) listeners.delete(key);
    }
    window.removeEventListener("storage", onStorage);
  };
}

/** Tell every subscriber of `key` that its value changed (same-tab writes). */
export function notifyStored(key) {
  const group = listeners.get(key);
  if (!group) return;
  [...group].forEach((listener) => listener());
}

/** Write a raw string to `key` and notify subscribers. `null` removes it. */
export function writeStored(key, raw) {
  if (typeof window === "undefined") return;
  try {
    if (raw === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, raw);
  } catch {
    // Private mode / quota — ignore, we just won't persist.
  }
  cache.delete(key);
  notifyStored(key);
}

export function writeStoredJSON(key, value) {
  writeStored(key, value === undefined || value === null ? null : JSON.stringify(value));
}

/**
 * Reactive JSON-backed state.
 * @param {string} storageKey
 * @param {any} fallback value used on the server and when nothing is stored
 */
export function useStoredJSON(storageKey, fallback) {
  const fallbackRef = useRef(fallback);

  const getSnapshot = useCallback(
    () => snapshot(storageKey, fallbackRef.current),
    [storageKey]
  );
  const getServerSnapshot = useCallback(() => fallbackRef.current, []);
  const subscribeKey = useCallback((onChange) => subscribe(storageKey, onChange), [storageKey]);

  const value = useSyncExternalStore(subscribeKey, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next) => {
      const resolved =
        typeof next === "function" ? next(snapshot(storageKey, fallbackRef.current)) : next;
      writeStoredJSON(storageKey, resolved);
    },
    [storageKey]
  );

  return [value, set];
}

/** Reactive raw-string state (for theme, language, …). */
export function useStoredString(storageKey, fallback) {
  const fallbackRef = useRef(fallback);

  const getSnapshot = useCallback(() => readRaw(storageKey) ?? fallbackRef.current, [storageKey]);
  const getServerSnapshot = useCallback(() => fallbackRef.current, []);
  const subscribeKey = useCallback((onChange) => subscribe(storageKey, onChange), [storageKey]);

  const value = useSyncExternalStore(subscribeKey, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next) => {
      const resolved = typeof next === "function" ? next(getSnapshot()) : next;
      writeStored(storageKey, resolved === undefined || resolved === null ? null : String(resolved));
    },
    [storageKey, getSnapshot]
  );

  return [value, set];
}

/**
 * Reactive CSS media query. Returns `false` during SSR / hydration and then
 * settles on the real value — no "read matchMedia in an effect" cascade.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  const getSnapshot = useCallback(
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    [query]
  );
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
