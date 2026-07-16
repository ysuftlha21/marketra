import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OutreachGenerationForm } from "@/features/outreach/components/outreach-generation-form";
import type { ApprovedRoleOption } from "@/features/outreach/components/outreach-types";

const mockRole: ApprovedRoleOption = {
  id: "role-1",
  title: "CTO",
  buyingRole: "decision_maker",
  priority: "primary",
  isPrimary: true,
  isSecondary: false,
  department: "Tech",
  fitScore: 90,
};

describe("OutreachGenerationForm component", () => {
  const defaultProps = {
    roles: [mockRole],
    selectedRole: mockRole,
    onRoleChange: vi.fn(),
    pending: false,
    usageExhausted: false,
    onSubmit: vi.fn(),
  };

  it("prevents submission with empty or whitespace-only objective", () => {
    render(<OutreachGenerationForm {...defaultProps} />);

    const submitBtn = screen.getByRole("button", { name: /generate outreach draft/i });
    expect(submitBtn).toBeDisabled();

    const objectiveInput = screen.getByLabelText(/outreach objective/i);
    fireEvent.change(objectiveInput, { target: { value: "   \n  " } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(objectiveInput, { target: { value: "Valid objective string here" } });
    expect(submitBtn).toBeEnabled();
  });

  it("enforces objective and instructions max lengths", () => {
    render(<OutreachGenerationForm {...defaultProps} />);
    const objectiveInput = screen.getByLabelText(/outreach objective/i);
    const instructionsInput = screen.getByLabelText(/additional instructions/i);

    expect(objectiveInput).toHaveAttribute("maxLength", "500");
    expect(instructionsInput).toHaveAttribute("maxLength", "1000");
  });

  it("resets incompatible message type on channel change and forces short length for linkedin_connection", () => {
    render(<OutreachGenerationForm {...defaultProps} />);

    // Default channel is email, default message type is initial_contact
    const channelSelect = screen.getByLabelText(/channel/i) as HTMLSelectElement;
    const messageSelect = screen.getByLabelText(/message type/i) as HTMLSelectElement;
    const lengthSelect = screen.getByLabelText(/length/i) as HTMLSelectElement;

    // Change to a message type valid for email
    fireEvent.change(messageSelect, { target: { value: "follow_up" } });
    expect(messageSelect.value).toBe("follow_up");

    // Change channel to linkedin_connection (which only supports connection_request)
    fireEvent.change(channelSelect, { target: { value: "linkedin_connection" } });

    // It should automatically reset to connection_request
    expect(messageSelect.value).toBe("connection_request");

    // Length should be forced to short and disabled
    expect(lengthSelect.value).toBe("short");
    expect(lengthSelect).toBeDisabled();
  });

  it("prevents double submission when pending", () => {
    render(<OutreachGenerationForm {...defaultProps} pending={true} />);
    const submitBtn = screen.getByRole("button", { name: /starting generation/i });
    expect(submitBtn).toBeDisabled();
  });

  it("preserves form values on safe failure (error prop)", () => {
    const { rerender } = render(<OutreachGenerationForm {...defaultProps} />);
    const objectiveInput = screen.getByLabelText(/outreach objective/i) as HTMLInputElement;
    fireEvent.change(objectiveInput, { target: { value: "Test objective" } });

    rerender(<OutreachGenerationForm {...defaultProps} error="Something went wrong" />);

    // Error is visible, but value remains
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(objectiveInput.value).toBe("Test objective");
  });

  it("disables generation when usage exhausted", () => {
    render(<OutreachGenerationForm {...defaultProps} usageExhausted={true} />);
    const submitBtn = screen.getByRole("button", { name: /outreach limit reached/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submits the correct data when form is valid", () => {
    render(<OutreachGenerationForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/outreach objective/i), {
      target: { value: "Ask for a meeting" },
    });
    fireEvent.change(screen.getByLabelText(/additional instructions/i), {
      target: { value: "Be polite" },
    });

    const submitBtn = screen.getByRole("button", { name: /generate outreach draft/i });
    fireEvent.click(submitBtn);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      roleId: "role-1",
      channel: "email",
      messageType: "initial_contact",
      language: "en",
      tone: "professional",
      length: "medium",
      objective: "Ask for a meeting",
      instructions: "Be polite",
    });
  });
});
