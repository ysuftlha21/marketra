export type SafeSignupErrorCode =
  | "weak_password"
  | "signup_disabled"
  | "email_provider_disabled"
  | "over_email_send_rate_limit"
  | "email_rate_limit_exceeded"
  | "rate_limit_exceeded"
  | "email_exists"
  | "user_already_exists"
  | "email_send_failed"
  | "smtp_error"
  | "email_delivery_failed"
  | "email_provider_error"
  | "unexpected_failure"
  | "database_error"
  | "database_failure"
  | "unknown_auth_error";

export interface SignupErrorPresentation {
  message: string;
  reference: string;
  safeCode: SafeSignupErrorCode;
}

const KNOWN_CODES = new Set<SafeSignupErrorCode>([
  "weak_password",
  "signup_disabled",
  "email_provider_disabled",
  "over_email_send_rate_limit",
  "email_rate_limit_exceeded",
  "rate_limit_exceeded",
  "email_exists",
  "user_already_exists",
  "email_send_failed",
  "smtp_error",
  "email_delivery_failed",
  "email_provider_error",
  "unexpected_failure",
  "database_error",
  "database_failure",
]);

const EMAIL_SEND_CODES = new Set<SafeSignupErrorCode>([
  "email_send_failed",
  "smtp_error",
  "email_delivery_failed",
  "email_provider_error",
]);

function safeCode(code: string | null | undefined): SafeSignupErrorCode {
  return code && KNOWN_CODES.has(code as SafeSignupErrorCode)
    ? (code as SafeSignupErrorCode)
    : "unknown_auth_error";
}

export function classifySignupError(error: {
  code?: string | null;
  status?: number;
  message?: string;
}): SignupErrorPresentation {
  const code = safeCode(error.code);

  if (
    error.status === 429 ||
    ["over_email_send_rate_limit", "email_rate_limit_exceeded", "rate_limit_exceeded"].includes(
      code,
    )
  ) {
    return {
      message: "Too many attempts. Please wait before trying again.",
      reference: "AUTH-SIGNUP-RATE-LIMIT",
      safeCode: code,
    };
  }

  if (code === "weak_password") {
    return {
      message: "Your password does not meet the security requirements.",
      reference: "AUTH-SIGNUP-WEAK-PASSWORD",
      safeCode: code,
    };
  }

  if (code === "signup_disabled" || code === "email_provider_disabled") {
    return {
      message: "Email sign-up is currently unavailable.",
      reference: "AUTH-SIGNUP-DISABLED",
      safeCode: code,
    };
  }

  if (code === "email_exists" || code === "user_already_exists") {
    return {
      message: "We could not create this account. Try signing in or resend the confirmation email.",
      reference: "AUTH-SIGNUP-ACCOUNT",
      safeCode: code,
    };
  }

  const looksLikeEmailDeliveryFailure =
    EMAIL_SEND_CODES.has(code) ||
    /smtp|sending (?:a )?(?:confirmation )?email|send(?:ing)? email|email delivery/i.test(
      error.message ?? "",
    );
  if (looksLikeEmailDeliveryFailure) {
    return {
      message: "We could not send the confirmation email. Please try again shortly.",
      reference: "AUTH-SIGNUP-EMAIL-SEND",
      safeCode: code,
    };
  }

  return {
    message: "We could not create your account due to a temporary service error.",
    reference: "AUTH-SIGNUP-SERVICE",
    safeCode: code,
  };
}
