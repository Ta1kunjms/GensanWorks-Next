export type PasswordValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validatePasswordRules(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Keep parity with server/auth.ts validatePassword()
  const hasSymbol = /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(password);
  if (!hasSymbol) {
    errors.push(
      "Password must contain at least one symbol (e.g., !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
