/**
 * Form Validation Utilities
 * Professional validation for user inputs across the application
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  return EMAIL_REGEX.test(email);
};

/**
 * Validate password strength
 * Requires: min 8 chars, uppercase, lowercase, number, special char
 */
export const validatePassword = (password: string): { isValid: boolean; strength: string } => {
  if (!password) return { isValid: false, strength: "empty" };
  if (password.length < 8) return { isValid: false, strength: "too_short" };

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  const strength = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  return {
    isValid: strength >= 3,
    strength:
      strength === 0 ? "weak" : strength === 1 ? "weak" : strength === 2 ? "medium" : "strong",
  };
};

/**
 * Validate username/name
 * 2-50 characters, alphanumeric and spaces allowed
 */
export const validateName = (name: string): boolean => {
  if (!name) return false;
  return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s]+$/.test(name);
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate form login credentials
 */
export const validateLoginForm = (email: string, password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else if (password.length < 6) {
    errors.push({ field: "password", message: "Password must be at least 6 characters" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate form registration
 */
export const validateRegistrationForm = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!name) {
    errors.push({ field: "name", message: "Name is required" });
  } else if (!validateName(name)) {
    errors.push({ field: "name", message: "Name must be 2-50 characters" });
  }

  if (!email) {
    errors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  } else {
    const pwdValidation = validatePassword(password);
    if (!pwdValidation.isValid) {
      errors.push({
        field: "password",
        message: "Password must contain uppercase, lowercase, number, and special character",
      });
    }
  }

  if (password !== confirmPassword) {
    errors.push({ field: "confirmPassword", message: "Passwords do not match" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate message for analysis
 */
export const validateAnalysisMessage = (message: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!message || !message.trim()) {
    errors.push({ field: "message", message: "Message is required" });
  } else if (message.length < 3) {
    errors.push({ field: "message", message: "Message must be at least 3 characters" });
  } else if (message.length > 5000) {
    errors.push({ field: "message", message: "Message must not exceed 5000 characters" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get error message for specific field
 */
export const getFieldError = (field: string, errors: ValidationError[]): string | null => {
  return errors.find((e) => e.field === field)?.message || null;
};
