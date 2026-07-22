import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, signUp } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({ createServerClient }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { signUpAction } = await import("./auth-actions");

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
    createServerClient.mockResolvedValue({ auth: { signUp } });
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
});
