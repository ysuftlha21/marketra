import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

const { signUpAction } = vi.hoisted(() => ({ signUpAction: vi.fn() }));

vi.mock("@/features/auth/api/auth-actions", () => ({ signUpAction }));

describe("SignUpForm", () => {
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
