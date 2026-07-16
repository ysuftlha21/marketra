import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OutreachProgressTracker } from "@/features/outreach/components/outreach-progress-tracker";

describe("OutreachProgressTracker component", () => {
  it("renders all stages with correct initial state (upcoming neutral)", () => {
    render(
      <OutreachProgressTracker currentStage={null} status="pending" safeErrorMessage={null} />,
    );
    // There are 10 stages total
    const stages = [
      "Preparing request",
      "Loading product context",
      "Loading market context",
      "Loading ICP",
      "Loading company information",
      "Loading decision-maker role",
      "Generating outreach draft",
      "Validating message quality",
      "Saving draft",
      "Complete",
    ];

    stages.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    // The first one "Preparing request" is active by default when currentStage is null
    const firstStage = screen.getByText("Preparing request");
    expect(firstStage).toHaveClass("text-foreground", "font-medium");

    // The rest are upcoming
    const secondStage = screen.getByText("Loading product context");
    expect(secondStage).toHaveClass("text-muted-foreground/50");
  });

  it("marks previous stages as completed and current as active", () => {
    render(
      <OutreachProgressTracker
        currentStage="generating_outreach"
        status="running"
        safeErrorMessage={null}
      />,
    );

    // generating_outreach is index 6
    const completedStage = screen.getByText("Loading ICP");
    expect(completedStage).toHaveClass("text-muted-foreground");
    expect(completedStage).not.toHaveClass("text-muted-foreground/50");

    const activeStage = screen.getByText("Generating outreach draft");
    expect(activeStage).toHaveClass("text-foreground", "font-medium");

    const upcomingStage = screen.getByText("Complete");
    expect(upcomingStage).toHaveClass("text-muted-foreground/50");
  });

  it("displays failed state with safe error message", () => {
    render(
      <OutreachProgressTracker
        currentStage="saving_draft"
        status="failed"
        safeErrorMessage="Unable to connect to service."
      />,
    );

    const failedStage = screen.getByText("Saving draft");
    expect(failedStage).toHaveClass("text-danger");

    expect(screen.getByText("Unable to connect to service.")).toBeInTheDocument();
  });
});
