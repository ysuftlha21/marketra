import { describe, it, expect } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema } from "./auth-schemas";

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a too-long email (254+ chars)", () => {
    const local = "a".repeat(64);
    const domain = "b".repeat(189);
    const email = `${local}@${domain}.com`;
    expect(email.length).toBeGreaterThan(254);
    const result = forgotPasswordSchema.safeParse({ email });
    expect(result.success).toBe(false);
  });

  it("trims and lowercases the email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "  User@Example.COM  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    const result = resetPasswordSchema.safeParse({
      password: "NewStrongPass1!",
      confirmPassword: "NewStrongPass1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when passwords do not match", () => {
    const result = resetPasswordSchema.safeParse({
      password: "NewStrongPass1!",
      confirmPassword: "DifferentPass1!",
    });
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Ab1!",
      confirmPassword: "Ab1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 128 characters", () => {
    const longPwd = "A1!" + "x".repeat(126);
    expect(longPwd.length).toBeGreaterThan(128);
    const result = resetPasswordSchema.safeParse({
      password: longPwd,
      confirmPassword: longPwd,
    });
    expect(result.success).toBe(false);
  });

  it("rejects when confirmPassword is missing", () => {
    const result = resetPasswordSchema.safeParse({ password: "NewStrongPass1!" });
    expect(result.success).toBe(false);
  });

  it("rejects when password is missing", () => {
    const result = resetPasswordSchema.safeParse({ confirmPassword: "NewStrongPass1!" });
    expect(result.success).toBe(false);
  });
});
