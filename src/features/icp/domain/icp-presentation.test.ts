import { describe, expect, it } from "vitest";
import { formatIcpDisplayValue, formatIcpLabel } from "./icp-presentation";

describe("ICP presentation", () => {
  it("renders industry objects as names instead of raw JSON", () => {
    expect(
      formatIcpDisplayValue([
        { name: "B2B SaaS", fit: "primary", reasoning: "Cloud-first operations" },
      ]),
    ).toBe("B2B SaaS");
  });

  it("renders empty and legacy primitive values safely", () => {
    expect(formatIcpDisplayValue([])).toBe("None");
    expect(formatIcpDisplayValue("[mock] Growth")).toBe("Growth");
    expect(formatIcpDisplayValue({ employeeRange: "51-200" })).toBe("Employee Range: 51-200");
  });

  it("humanizes snake and camel case labels", () => {
    expect(formatIcpLabel("primary_industries")).toBe("Primary industries");
    expect(formatIcpLabel("employeeRange")).toBe("Employee Range");
  });
});
