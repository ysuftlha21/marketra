import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProjectForm } from "./project-form";

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock server actions to isolate form tests
vi.mock("@/features/projects/api/project-actions", () => ({
  createProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
}));

describe("ProjectForm Validation UX", () => {
  it("displays validation error when currentMarkets uses invalid codes", async () => {
    render(<ProjectForm />);

    const marketsInput = screen.getByLabelText(/Current markets/i);
    fireEvent.change(marketsInput, { target: { value: "Germany" } });
    fireEvent.blur(marketsInput);

    await waitFor(() => {
      expect(screen.getByText("Country code must be exactly 2 characters")).toBeInTheDocument();
    });
  });

  it("accepts valid comma-separated country codes", async () => {
    render(<ProjectForm />);

    const marketsInput = screen.getByLabelText(/Current markets/i);
    fireEvent.change(marketsInput, { target: { value: "US, UK, DE" } });
    fireEvent.blur(marketsInput);

    await waitFor(() => {
      expect(
        screen.queryByText("Country code must be exactly 2 characters"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("Must be a valid ISO 3166 alpha-2 country code"),
      ).not.toBeInTheDocument();
    });
  });

  it("displays validation error when optional fields exceed limits", async () => {
    render(<ProjectForm />);

    const businessModelInput = screen.getByLabelText(/Business model/i);

    // Generate a 1001 character string
    const longString = "a".repeat(1001);

    fireEvent.change(businessModelInput, { target: { value: longString } });
    fireEvent.blur(businessModelInput);

    await waitFor(() => {
      const alert = screen.getByText("Business model must be at most 1000 characters");
      expect(alert).toBeInTheDocument();
    });
  });
});
