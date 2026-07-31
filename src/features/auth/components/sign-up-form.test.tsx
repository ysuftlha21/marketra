import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

const { signUpAction } = vi.hoisted(() => ({ signUpAction: vi.fn() }));

vi.mock("@/features/auth/api/auth-actions", () => ({ signUpAction }));

describe("SignUpForm", () => {
  it("shows a safe message and stable error reference without provider details", async () => {
    signUpAction.mockResolvedValue({
      error: "We could not send the confirmation email. Please try again shortly.",
      errorReference: "AUTH-SIGNUP-EMAIL-SEND",
    });
    render(<SignUpForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "founder@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "SecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "SecurePass123!" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Create account form" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We could not send the confirmation email. Please try again shortly.",
    );
    expect(alert).toHaveTextContent("Error reference: AUTH-SIGNUP-EMAIL-SEND");
    expect(alert).not.toHaveTextContent("SMTP");
  });

  it("prevents repeated submissions while signup is pending", async () => {
    let resolveSignUp: ((value: { error?: string }) => void) | undefined;
    signUpAction.mockImplementation(
      () =>
        new Promise<{ error?: string }>((resolve) => {
          resolveSignUp = resolve;
        }),
    );
    render(<SignUpForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "founder@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "SecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "SecurePass123!" },
    });

    const form = screen.getByRole("form", { name: "Create account form" });
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(signUpAction).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /creating account/i })).toHaveAttribute(
      "aria-busy",
      "true",
    );

    resolveSignUp?.({});
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create account/i })).toBeEnabled(),
    );
  });
});
