import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OutreachCopyButton } from "@/features/outreach/components/outreach-copy-button";

describe("OutreachCopyButton component", () => {
  const originalClipboard = global.navigator.clipboard;
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Object.defineProperty(global.navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    Object.defineProperty(global.navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("renders correctly with label", () => {
    render(<OutreachCopyButton text="Test text" label="Copy item" />);
    expect(screen.getByRole("button", { name: "Copy item" })).toBeInTheDocument();
    expect(screen.getByText("Copy item")).toBeInTheDocument();
  });

  it("copies to clipboard and shows Copied state for 2 seconds", async () => {
    mockWriteText.mockResolvedValue(undefined);
    render(<OutreachCopyButton text="Test text" label="Copy item" />);

    const button = screen.getByRole("button", { name: "Copy item" });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith("Test text");
    expect(screen.getByText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.getByText("Copy item")).toBeInTheDocument();
  });

  it("handles clipboard failure gracefully", async () => {
    mockWriteText.mockRejectedValue(new Error("Denied"));
    render(<OutreachCopyButton text="Test text" label="Copy item" />);

    const button = screen.getByRole("button", { name: "Copy item" });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalled();
    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.getByText("Copy item")).toBeInTheDocument();
  });
});
