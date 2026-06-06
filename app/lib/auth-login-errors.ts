const DEFAULT_SIGN_IN_ERROR = "Sign in failed. Please try again.";

type AuthLoginErrorOptions = {
  accountExists: boolean;
  roleLabel: string;
};

export function getLoginErrorMessage(authError: string | undefined, options: AuthLoginErrorOptions) {
  const normalizedError = authError?.toLowerCase() ?? "";
  const rolePrefix = options.roleLabel ? `${options.roleLabel} ` : "";

  if (!options.accountExists) {
    return `No ${rolePrefix}account found for this email.`.replace(/\s+/g, " ").trim();
  }

  if (normalizedError.includes("invalid login credentials")) {
    return options.roleLabel ? `Incorrect ${options.roleLabel.toLowerCase()} password.` : "Incorrect password.";
  }

  if (normalizedError.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (normalizedError.includes("too many requests")) {
    return "Too many sign-in attempts. Please try again in a moment.";
  }

  return authError || DEFAULT_SIGN_IN_ERROR;
}
