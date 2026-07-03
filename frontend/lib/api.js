import { API_BASE_URL, API_TIMEOUT, API_ENDPOINTS, ERROR_MESSAGES } from "./constants";

/**
 * API Client with error handling and timeout
 */
class ApiClient {
  constructor(baseURL = API_BASE_URL, timeout = API_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Make API request with timeout and error handling
   */
  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.error || ERROR_MESSAGES.UNKNOWN,
          response.status,
          error
        );
      }

      return response.json();
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        throw err;
      }

      if (err.name === "AbortError") {
        throw new ApiError(ERROR_MESSAGES.NETWORK, 408);
      }

      throw new ApiError(err.message || ERROR_MESSAGES.UNKNOWN, 500);
    }
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: "GET",
      ...options,
    });
  }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, status = 500, details = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const apiClient = new ApiClient();

/**
 * Analysis APIs
 */
export async function analyzeMessage(message, senderInfo = {}) {
  if (!message || !message.trim()) {
    throw new ApiError(ERROR_MESSAGES.VALIDATION);
  }

  const body = {
    message: message.trim(),
  };
  if (senderInfo.senderEmail) body.senderEmail = senderInfo.senderEmail.trim();
  if (senderInfo.domain) body.domain = senderInfo.domain.trim();
  if (senderInfo.senderPhone) body.senderPhone = senderInfo.senderPhone.trim();

  return apiClient.post(API_ENDPOINTS.ANALYSIS.MESSAGE, body);
}

export async function checkUrl(url) {
  if (!url || !url.trim()) {
    throw new ApiError(ERROR_MESSAGES.VALIDATION);
  }

  return apiClient.post(API_ENDPOINTS.ANALYSIS.URL, {
    url: url.trim(),
  });
}

export async function analyzeImage(base64Image) {
  if (!base64Image) {
    throw new ApiError(ERROR_MESSAGES.VALIDATION);
  }

  return apiClient.post(API_ENDPOINTS.ANALYSIS.IMAGE, {
    image: base64Image,
  });
}

/**
 * Export for access to the API client and error class
 */
export { apiClient, ApiError };

