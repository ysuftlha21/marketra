import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckEmailCard } from "./check-email-card";

const { resendSignupConfirmationAction } = vi.hoisted(() => ({
  resendSignupConfirmationAction: vi.fn(),
}));

vi.mock("@/features/auth/api/auth-actions", () => ({
  resendSignupConfirmationAction,
}));

describe("CheckEmailCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a polished confirmation state with a masked recipient", () => {
    render(<CheckEmailCard email="founder@example.com" maskedEmail="fo•••••@example.com" />);

    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText("fo•••••@example.com")).toBeInTheDocument();
    expect(screen.queryByText("founder@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(/spam or promotions folder/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend available in 60s" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Change email" })).toHaveAttribute("href", "/sign-up");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("shows resend success and starts a new 60-second cooldown", async () => {
    resendSignupConfirmationAction.mockResolvedValue({
      ok: true,
      message: "If this address can receive a confirmation email, a new message has been sent.",
    });
    render(
      <CheckEmailCard
        email="founder@example.com"
        maskedEmail="fo•••••@example.com"
        initialCooldownSeconds={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("a new message has been sent"),
    );
    expect(screen.getByRole("button", { name: "Resend available in 60s" })).toBeDisabled();
  });

  it("renders a rate-limit response as an accessible alert", async () => {
    resendSignupConfirmationAction.mockResolvedValue({
      error: "Too many confirmation emails have been requested. Please wait a while and try again.",
    });
    render(
      <CheckEmailCard
        email="founder@example.com"
        maskedEmail="fo•••••@example.com"
        initialCooldownSeconds={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Too many confirmation emails"),
    );
    expect(screen.getByRole("button", { name: "Resend available in 60s" })).toBeDisabled();
  });

  it("shows a controlled failure without exposing provider details", async () => {
    resendSignupConfirmationAction.mockRejectedValue(
      new Error("raw Supabase stack with internal response"),
    );
    render(
      <CheckEmailCard
        email="founder@example.com"
        maskedEmail="fo•••••@example.com"
        initialCooldownSeconds={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Resend confirmation email" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not request another confirmation email",
      ),
    );
    expect(screen.queryByText(/Supabase|stack|internal response/i)).not.toBeInTheDocument();
  });
});
