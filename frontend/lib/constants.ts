/**
 * Application Constants
 * Centralized configuration for consistent behavior across the app
 */

// Brand Information
export const APP_NAME = "NegaritAI";
export const APP_DESCRIPTION = "AI-Powered Threat Detection & Analysis Platform";
export const APP_VERSION = "1.0.0";

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second

// File Limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// Analysis Configuration
export const RISK_LEVELS = {
  SAFE: { label: "Safe", color: "#10b981", min: 0, max: 30 },
  SUSPICIOUS: { label: "Suspicious", color: "#f59e0b", min: 31, max: 70 },
  DANGER: { label: "Danger", color: "#ef4444", min: 71, max: 100 },
};

export const THREAT_TYPES = [
  "Phishing URL",
  "Deepfake AI",
  "Malware File",
  "SMS Scam",
  "Email Spoofing",
  "Social Engineering",
  "Credential Theft",
  "Ransomware",
];

// Authentication
export const TOKEN_STORAGE_KEY = "token";
export const USER_STORAGE_KEY = "user";
export const AUTH_HEADER_PREFIX = "Bearer";
export const TOKEN_EXPIRY_DAYS = 7;

// UI Configuration
export const TOAST_DURATION = 4000; // 4 seconds
export const ANIMATION_DURATION_FAST = 150; // ms
export const ANIMATION_DURATION_BASE = 300; // ms
export const ANIMATION_DURATION_SLOW = 500; // ms

// Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  ANALYZE_MESSAGE: "/analyze-message",
  ANALYZE_IMAGE: "/analyze-image",
  ANALYZE: "/analyze",
  THREAT_HISTORY: "/threat-history",
  REPORTS: "/reports",
  SETTINGS: "/settings",
  HELP: "/help",
  LIBRARY: "/library",
  NOT_FOUND: "/not-found",
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your connection.",
  SERVER: "Server error. Please try again later.",
  UNAUTHORIZED: "Please log in to continue.",
  FORBIDDEN: "You don't have permission to access this resource.",
  NOT_FOUND: "Resource not found.",
  VALIDATION: "Please check your input and try again.",
  UNKNOWN: "An unexpected error occurred.",
  FILE_TOO_LARGE: "File is too large. Maximum size is 10MB.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload an image.",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ANALYSIS_COMPLETE: "Analysis completed successfully!",
  LOGIN_SUCCESS: "Logged in successfully!",
  REGISTER_SUCCESS: "Registration successful! Please log in.",
  LOGOUT_SUCCESS: "Logged out successfully!",
  PROFILE_UPDATED: "Profile updated successfully!",
  SETTINGS_SAVED: "Settings saved successfully!",
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    ME: "/api/auth/me",
    LOGOUT: "/api/auth/logout",
  },
  ANALYSIS: {
    MESSAGE: "/analyze",
    URL: "/check-url",
    IMAGE: "/analyze-image",
  },
};

// User Roles
export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  MODERATOR = "moderator",
}

// Analysis Status
export enum AnalysisStatus {
  PENDING = "pending",
  ANALYZING = "analyzing",
  COMPLETED = "completed",
  FAILED = "failed",
}
