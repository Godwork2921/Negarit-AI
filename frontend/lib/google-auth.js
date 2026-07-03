// lib/google-auth.js
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/* ---------------- Initialization ---------------- */
export function initializeGoogleAuth() {
  return new Promise((resolve, reject) => {
    if (window.google) {
      resolve();
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error("Google Client ID not configured"));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          ux_mode: "popup",
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

/* ---------------- Callback ---------------- */
async function handleGoogleCallback(response) {
  if (!response.credential) return;
  const result = await verifyGoogleToken(response.credential);
  if (result.token) {
    localStorage.setItem("authToken", result.token);
    localStorage.setItem("user", JSON.stringify(result.user));
    window.dispatchEvent(new CustomEvent("google-signin-success", { detail: result }));
  } else {
    window.dispatchEvent(new CustomEvent("google-signin-error", { detail: { message: "Auth failed" } }));
  }
}

/* ---------------- Render Button ---------------- */
export function renderGoogleSignInButton(containerId, options = {}) {
  if (!window.google) return;
  const defaultOptions = { theme: "outline", size: "large", width: "100%", text: "continue_with", ...options };
  const container = document.getElementById(containerId);
  if (container) window.google.accounts.id.renderButton(container, defaultOptions);
}

/* ---------------- Verify Token ---------------- */
async function verifyGoogleToken(token) {
  const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw new Error("Failed to verify Google token");
  return await response.json();
}

/* ---------------- Sign Out ---------------- */
export function signOutGoogle() {
  if (window.google) window.google.accounts.id.disableAutoSelect();
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
}

/* ---------------- Auth Check ---------------- */
export function isGoogleAuthenticated() {
  return !!localStorage.getItem("authToken");
}
