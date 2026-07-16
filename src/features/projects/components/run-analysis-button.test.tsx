import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RunAnalysisButton } from "./run-analysis-button";
import { runAnalysisAction } from "@/features/projects/api/project-actions";

// Mock next/navigation
const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

// Mock API actions
vi.mock("@/features/projects/api/project-actions", () => ({
  runAnalysisAction: vi.fn(),
  retryAnalysisAction: vi.fn(),
}));

describe("RunAnalysisButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no active run shows 'Start analysis'", () => {
    render(<RunAnalysisButton projectSlug="test" canRun={true} />);
    expect(screen.getByRole("button", { name: /start analysis/i })).toBeInTheDocument();
  });

  it("page reload with completed run shows 'Run again'", () => {
    render(
      <RunAnalysisButton
        projectSlug="test"
        canRun={true}
        status="succeeded"
        runId="run-1"
        isRetry={true}
        previousRunId="run-1"
      />,
    );
    expect(screen.getByRole("button", { name: /run again/i })).toBeInTheDocument();
  });

  it("successful completion clears pending state and shows toast", async () => {
    vi.mocked(runAnalysisAction).mockResolvedValueOnce({ ok: true, runId: "new-run-1" });

    const { rerender } = render(<RunAnalysisButton projectSlug="test" canRun={true} />);

    // Click button to start run
    fireEvent.click(screen.getByRole("button", { name: /start analysis/i }));

    // Should immediately show running
    expect(screen.getByRole("button", { name: /running/i })).toBeInTheDocument();

    // Wait for action to resolve
    await waitFor(() => {
      expect(runAnalysisAction).toHaveBeenCalledTimes(1);
    });

    // Simulate router.refresh bringing down new props
    rerender(
      <RunAnalysisButton projectSlug="test" canRun={true} status="succeeded" runId="new-run-1" />,
    );

    // Should clear pending state and show success
    expect(screen.getByRole("button", { name: /start analysis/i })).toBeInTheDocument();
    expect(await screen.findByText(/analysis completed successfully/i)).toBeInTheDocument();
  });

  it("success toast appears once (no duplicate notifications after page refresh)", () => {
    const { rerender } = render(
      <RunAnalysisButton
        projectSlug="test"
        canRun={true}
        status="succeeded"
        runId="existing-run"
      />,
    );
    // Should NOT show toast on initial load with completed run
    expect(screen.queryByText(/analysis completed successfully/i)).not.toBeInTheDocument();

    // Re-render with same runId doesn't trigger toast
    rerender(
      <RunAnalysisButton
        projectSlug="test"
        canRun={true}
        status="succeeded"
        runId="existing-run"
      />,
    );
    expect(screen.queryByText(/analysis completed successfully/i)).not.toBeInTheDocument();
  });

  it("failed run clears pending state and shows safe error", async () => {
    vi.mocked(runAnalysisAction).mockResolvedValueOnce({ ok: true, runId: "failed-run" });

    const { rerender } = render(<RunAnalysisButton projectSlug="test" canRun={true} />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: /running/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(runAnalysisAction).toHaveBeenCalledTimes(1);
    });

    // Simulate backend failing
    rerender(
      <RunAnalysisButton projectSlug="test" canRun={true} status="failed" runId="failed-run" />,
    );

    expect(screen.getByRole("button", { name: /start analysis/i })).toBeInTheDocument();
    expect(await screen.findByText(/analysis failed. try again/i)).toBeInTheDocument();
  });

  it("duplicate active run remains blocked", () => {
    render(<RunAnalysisButton projectSlug="test" canRun={true} status="running" />);
    // Initial render with running status should disable button
    const button = screen.getByRole("button", { name: /running/i });
    expect(button).toBeDisabled();

    // Clicking should do nothing (it's disabled)
    fireEvent.click(button);
    expect(runAnalysisAction).not.toHaveBeenCalled();
  });

  it("completed run stops polling", () => {
    vi.useFakeTimers();
    mockRouterRefresh.mockClear();

    const { rerender, unmount } = render(
      <RunAnalysisButton projectSlug="test" canRun={true} status="running" />,
    );

    // Advance time, polling should happen
    vi.advanceTimersByTime(3000);
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1);

    // Run completes
    rerender(<RunAnalysisButton projectSlug="test" canRun={true} status="succeeded" />);

    // Advance time again, polling should have stopped
    vi.advanceTimersByTime(3000);
    expect(mockRouterRefresh).toHaveBeenCalledTimes(1); // No new calls

    unmount();
    vi.useRealTimers();
  });
});
