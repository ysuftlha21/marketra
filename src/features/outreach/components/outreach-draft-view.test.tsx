import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OutreachDraftView } from "@/features/outreach/components/outreach-draft-view";

describe("OutreachDraftView component", () => {
  it("renders email subject and body", () => {
    const draft = {
      channel: "email",
      messageType: "initial_contact",
      subject: "Test Subject",
      body: "Test Body",
      callToAction: "Test CTA",
    };
    render(<OutreachDraftView draft={draft} />);

    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Test Subject")).toBeInTheDocument();

    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Test Body")).toBeInTheDocument();

    expect(screen.getByText("Call to Action")).toBeInTheDocument();
    expect(screen.getByText("Test CTA")).toBeInTheDocument();
  });

  it("renders linkedin connection without subject", () => {
    const draft = {
      channel: "linkedin_connection",
      messageType: "connection_request",
      subject: "Should not show",
      body: "Connection body",
    };
    render(<OutreachDraftView draft={draft} />);

    // Subject shouldn't be rendered
    expect(screen.queryByText("Subject")).not.toBeInTheDocument();
    expect(screen.queryByText("Should not show")).not.toBeInTheDocument();

    expect(screen.getByText("Connection Message")).toBeInTheDocument();
    expect(screen.getByText("Connection body")).toBeInTheDocument();
  });

  it("renders linkedin message variation", () => {
    const draft = {
      channel: "linkedin_message",
      messageType: "initial_contact",
      body: "LinkedIn Message Body",
    };
    render(<OutreachDraftView draft={draft} />);

    expect(screen.queryByText("Subject")).not.toBeInTheDocument();

    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn Message Body")).toBeInTheDocument();
  });

  it("renders confidence, context, warnings, and missing info", () => {
    const draft = {
      channel: "email",
      confidence: 85,
      personalizationSummary: {
        companyContextUsed: "Yes",
      },
      evidenceUsed: ["Evidence 1"],
      assumptions: ["Assumption 1"],
      warnings: ["Warning 1"],
      missingInformation: ["Missing 1"],
    };
    render(<OutreachDraftView draft={draft} />);

    expect(screen.getByText("Analysis Metadata")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText(/Company: Yes/)).toBeInTheDocument();
    expect(screen.getByText("Evidence 1")).toBeInTheDocument();
    expect(screen.getByText("Assumption 1")).toBeInTheDocument();
    expect(screen.getByText("Warning 1")).toBeInTheDocument();
    expect(screen.getByText("Missing 1")).toBeInTheDocument();
  });

  it("renders safe fallback for invalid view model", () => {
    const invalidDraft = {}; // Missing all expected fields

    // Should not crash, should render what it can safely
    render(<OutreachDraftView draft={invalidDraft} />);

    expect(screen.getByText("Generated Draft")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("hides internal metadata like model and tokens by design (does not render them)", () => {
    const draft = {
      model: "gpt-4",
      tokens: 1500,
      providerData: {},
      channel: "email",
      body: "Test",
    };
    render(<OutreachDraftView draft={draft} />);

    // The component shouldn't render these fields
    expect(screen.queryByText("gpt-4")).not.toBeInTheDocument();
    expect(screen.queryByText("1500")).not.toBeInTheDocument();
  });
});
