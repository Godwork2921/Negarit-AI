import {
  API_BASE_URL,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  AUTH_HEADER_PREFIX,
} from "./constants";
import { notifyStored } from "./store";

/**
 * Login user with email and password
 */
export async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error(ERROR_MESSAGES.VALIDATION);
  }

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || ERROR_MESSAGES.SERVER);
  }

  if (!data.token) {
    throw new Error("No token received from server");
  }

  // Store auth data
  localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
  if (data.user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }

  return data;
}

/**
 * Register new user
 */
export async function registerUser(name, email, password) {
  if (!name || !email || !password) {
    throw new Error(ERROR_MESSAGES.VALIDATION);
  }

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || ERROR_MESSAGES.SERVER);
  }

  if (!data.token) {
    throw new Error("No token received from server");
  }

  // Store auth data
  localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
  if (data.user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  }

  return data;
}

/**
 * Logout user
 */
export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  notifyStored(USER_STORAGE_KEY);
  notifyStored(TOKEN_STORAGE_KEY);
}

/**
 * Get stored auth token
 */
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Get stored user data
 */
export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    console.error("Failed to parse user data");
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Get authorization header
 */
export function getAuthHeader() {
  const token = getToken();
  if (!token) return null;
  return {
    Authorization: `${AUTH_HEADER_PREFIX} ${token}`,
  };
}

/**
 * Check if token is expired (simplified)
 */
export function isTokenExpired() {
  const token = getToken();
  if (!token) return true;

  try {
    // Decode JWT payload (without verification)
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const payload = JSON.parse(atob(parts[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    return Date.now() > expiresAt;
  } catch {
    return true;
  }
}

