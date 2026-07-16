import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OutreachSection } from "@/features/outreach/components/outreach-section";
import {
  generateOutreachAction,
  getOutreachRunStatusAction,
  getOutreachDraftViewAction,
} from "@/features/outreach/api/outreach-actions";

vi.mock("@/features/outreach/api/outreach-actions", () => ({
  generateOutreachAction: vi.fn(),
  getOutreachRunStatusAction: vi.fn(),
  getOutreachDraftViewAction: vi.fn(),
}));

const mockRole = {
  id: "role-1",
  workspace_id: "ws-1",
  project_id: "proj-1",
  company_id: "comp-1",
  source_run_id: "run-1",
  source_type: "generated" as const,
  role_key: "cto",
  role_title: "CTO",
  role_family: "Engineering",
  department: "Tech",
  buying_role: "decision_maker",
  priority: "primary",
  fit_score: 90,
  confidence_score: 85,
  reasoning: "Test role",
  evidence: {},
  likely_pain_points: [],
  likely_objections: [],
  recommended_message_angles: [],
  title_variants: [],
  seniority_levels: [],
  company_size_relevance: "High",
  country_relevance: "High",
  status: "approved" as const,
  is_primary: true,
  is_secondary: false,
  user_notes: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const defaultProps = {
  roles: [mockRole],
  projectSlug: "test",
  countryCode: "US",
  countryId: "us-1",
  companyId: "comp-1",
  initialUsage: { used: 0, limit: 10, remaining: 10 },
  initialDraft: null,
};

describe("OutreachSection polling logic", () => {
  let mockSetInterval: ReturnType<typeof vi.spyOn>;
  let mockClearInterval: ReturnType<typeof vi.spyOn>;
  let intervalCallback: (() => Promise<void>) | null = null;
  const intervalId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetInterval = vi.spyOn(global, "setInterval").mockImplementation((cb) => {
      intervalCallback = cb as () => Promise<void>;
      return intervalId as unknown as NodeJS.Timeout;
    });
    mockClearInterval = vi.spyOn(global, "clearInterval").mockImplementation(() => {
      intervalCallback = null;
    });
  });

  afterEach(() => {
    mockSetInterval.mockRestore();
    mockClearInterval.mockRestore();
  });

  it("polling logic: stops on success, no overlap, interval clears", async () => {
    vi.mocked(generateOutreachAction).mockResolvedValue({ success: true, runId: "run-123" });
    vi.mocked(getOutreachRunStatusAction)
      .mockResolvedValueOnce({
        status: "running",
        currentStage: "generating_outreach",
        safeErrorMessage: null,
      })
      .mockResolvedValueOnce({
        status: "succeeded",
        currentStage: "complete",
        safeErrorMessage: null,
        draftId: "draft-1",
      });

    vi.mocked(getOutreachDraftViewAction).mockResolvedValue({
      success: true,
      draft: {
        id: "draft-1",
        channel: "email",
        messageType: "initial_contact",
        content: { subject: "Sub", body: "Bod" },
        context: {},
      },
    });

    const { unmount } = render(<OutreachSection {...defaultProps} />);

    // Fill form to submit
    fireEvent.change(screen.getByLabelText(/outreach objective/i), {
      target: { value: "Test objective goes here" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate outreach draft/i }));

    await waitFor(() => {
      expect(generateOutreachAction).toHaveBeenCalled();
    });

    // setInterval should have been called
    expect(mockSetInterval).toHaveBeenCalled();
    expect(intervalCallback).not.toBeNull();

    // Trigger first poll
    await act(async () => {
      await intervalCallback!();
    });
    expect(getOutreachRunStatusAction).toHaveBeenCalledTimes(1);

    // Trigger second poll
    await act(async () => {
      await intervalCallback!();
    });
    expect(getOutreachRunStatusAction).toHaveBeenCalledTimes(2);

    // It should have cleared interval because it succeeded
    expect(mockClearInterval).toHaveBeenCalledWith(intervalId);

    unmount();
  });

  it("polling logic: stops on failure", async () => {
    vi.mocked(generateOutreachAction).mockResolvedValue({ success: true, runId: "run-123" });
    vi.mocked(getOutreachRunStatusAction).mockResolvedValueOnce({
      status: "failed",
      currentStage: "saving_draft",
      safeErrorMessage: "Failed to save",
    });

    render(<OutreachSection {...defaultProps} />);

    fireEvent.change(screen.getByLabelText(/outreach objective/i), {
      target: { value: "Test objective goes here" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate outreach draft/i }));

    await waitFor(() => expect(generateOutreachAction).toHaveBeenCalled());

    // Trigger poll
    await act(async () => {
      await intervalCallback!();
    });

    expect(getOutreachRunStatusAction).toHaveBeenCalledTimes(1);

    // Interval cleared
    expect(mockClearInterval).toHaveBeenCalledWith(intervalId);

    // Shows error UI
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
  });
});
