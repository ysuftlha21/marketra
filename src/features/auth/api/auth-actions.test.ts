import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerClient,
  signUp,
  resend,
  redirect,
  enforceRateLimit,
  safeRateLimitMessage,
  logOperation,
} = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  redirect: vi.fn(),
  enforceRateLimit: vi.fn(),
  safeRateLimitMessage: vi.fn(),
  logOperation: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({ createServerClient }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/security/rate-limit-service", () => ({
  enforceRateLimit,
  safeRateLimitMessage,
}));
vi.mock("@/lib/observability/logger", () => ({ logOperation }));

const { resendSignupConfirmationAction, signUpAction } = await import("./auth-actions");

function validSignUpForm() {
  const formData = new FormData();
  formData.set("email", "founder@example.com");
  formData.set("password", "SecurePass123!");
  formData.set("confirmPassword", "SecurePass123!");
  return formData;
}

function authFailure(code: string, status = 400) {
  signUp.mockResolvedValue({
    data: { user: null, session: null },
    error: { code, status, message: "raw Supabase provider detail" },
  });
}

describe("signUpAction safe errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(undefined);
    createServerClient.mockResolvedValue({ auth: { signUp, resend } });
  });

  it.each([
    ["over_email_send_rate_limit", 400],
    ["email_rate_limit_exceeded", 400],
    ["unexpected_code", 429],
  ])("maps email rate limiting without exposing provider details (%s)", async (code, status) => {
    authFailure(code, status);

    await expect(signUpAction(validSignUpForm())).resolves.toEqual({
      error: "Too many confirmation emails have been requested. Please wait a while and try again.",
    });
  });

  it("keeps already-registered responses generic", async () => {
    authFailure("user_already_exists");

    await expect(signUpAction(validSignUpForm())).resolves.toEqual({
      error: "Could not complete the request. Please try again.",
    });
  });

  it("rejects invalid input before calling Supabase", async () => {
    const formData = validSignUpForm();
    formData.set("email", "not-an-email");

    await expect(signUpAction(formData)).resolves.toEqual({
      error: "Enter a valid email address",
    });
    expect(createServerClient).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("uses the generic safe fallback for unknown internal errors", async () => {
    signUp.mockRejectedValue(new Error("stack trace with internal API response"));

    await expect(signUpAction(validSignUpForm())).resolves.toEqual({
      error: "Sign up failed. Please try again.",
    });
  });

  it("redirects a successful unconfirmed signup to the masked-email flow", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: null },
      error: null,
    });
    const formData = validSignUpForm();
    formData.set("displayName", "  Ada Lovelace  ");

    await signUpAction(formData);

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ display_name: "Ada Lovelace" }),
          emailRedirectTo: expect.stringMatching(/\/auth\/callback\?next=\/dashboard$/),
        }),
      }),
    );
    expect(redirect).toHaveBeenCalledWith("/sign-up/check-email?email=founder%40example.com");
    expect(redirect).not.toHaveBeenCalledWith("/onboarding");
  });

  it("treats every successful sessionless response as confirmation-pending", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    await signUpAction(validSignUpForm());

    expect(redirect).toHaveBeenCalledWith("/sign-up/check-email?email=founder%40example.com");
  });

  it("continues a confirmed signup session to onboarding", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "user-1" }, session: { access_token: "not-logged" } },
      error: null,
    });

    await signUpAction(validSignUpForm());

    expect(redirect).toHaveBeenCalledWith("/onboarding");
    expect(redirect).not.toHaveBeenCalledWith(expect.stringContaining("/check-email"));
  });
});

describe("resendSignupConfirmationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceRateLimit.mockResolvedValue(undefined);
    createServerClient.mockResolvedValue({ auth: { signUp, resend } });
  });

  function resendForm() {
    const formData = new FormData();
    formData.set("email", "founder@example.com");
    return formData;
  }

  it("uses the Supabase signup resend contract and returns an enumeration-safe success", async () => {
    resend.mockResolvedValue({ error: null });

    await expect(resendSignupConfirmationAction(resendForm())).resolves.toMatchObject({
      ok: true,
    });
    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "founder@example.com",
      options: {
        emailRedirectTo: expect.stringMatching(/\/auth\/callback\?next=\/dashboard$/),
      },
    });
    expect(logOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: "auth.signup_confirmation_resend",
        success: true,
      }),
    );
    expect(JSON.stringify(logOperation.mock.calls)).not.toContain("founder@example.com");
  });

  it("maps Supabase email throttling to the controlled message", async () => {
    resend.mockResolvedValue({
      error: { status: 429, code: "over_email_send_rate_limit", message: "raw" },
    });

    await expect(resendSignupConfirmationAction(resendForm())).resolves.toEqual({
      error: "Too many confirmation emails have been requested. Please wait a while and try again.",
    });
  });

  it("enforces production rate limiting before calling Supabase", async () => {
    enforceRateLimit.mockRejectedValue(new Error("limiter unavailable"));
    safeRateLimitMessage.mockReturnValue(
      "Too many requests. Please wait 60 seconds and try again.",
    );

    await expect(resendSignupConfirmationAction(resendForm())).resolves.toEqual({
      error: "Too many requests. Please wait 60 seconds and try again.",
    });
    expect(resend).not.toHaveBeenCalled();
  });

  it("does not disclose whether an unrelated account exists", async () => {
    resend.mockResolvedValue({
      error: { status: 400, code: "user_not_found", message: "raw provider response" },
    });

    await expect(resendSignupConfirmationAction(resendForm())).resolves.toMatchObject({
      ok: true,
    });
  });
});
