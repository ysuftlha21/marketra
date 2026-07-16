import { describe, it, expect } from "vitest";
import {
  canEdit,
  canApprove,
  canReject,
  canRestore,
  canArchive,
  icpProfileStatusSchema,
} from "./icp-status";

describe("icpProfileStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["draft", "approved", "rejected", "archived"]) {
      expect(icpProfileStatusSchema.safeParse(s).success).toBe(true);
    }
  });
  it("rejects invalid", () => {
    expect(icpProfileStatusSchema.safeParse("published").success).toBe(false);
  });
});

describe("ICP status transitions", () => {
  it("canEdit: draft and rejected", () => {
    expect(canEdit("draft")).toBe(true);
    expect(canEdit("rejected")).toBe(true);
    expect(canEdit("approved")).toBe(false);
    expect(canEdit("archived")).toBe(false);
  });
  it("canApprove: only draft", () => {
    expect(canApprove("draft")).toBe(true);
    expect(canApprove("approved")).toBe(false);
    expect(canApprove("rejected")).toBe(false);
  });
  it("canReject: only draft", () => {
    expect(canReject("draft")).toBe(true);
    expect(canReject("approved")).toBe(false);
  });
  it("canRestore: only rejected", () => {
    expect(canRestore("rejected")).toBe(true);
    expect(canRestore("draft")).toBe(false);
  });
  it("canArchive: draft, rejected, approved", () => {
    expect(canArchive("draft")).toBe(true);
    expect(canArchive("rejected")).toBe(true);
    expect(canArchive("approved")).toBe(true);
    expect(canArchive("archived")).toBe(false);
  });
});
