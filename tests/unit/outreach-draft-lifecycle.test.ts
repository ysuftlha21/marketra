import { describe, expect, it } from "vitest";
import {
  canEditOutreach,
  canReviewOutreach,
  canTransitionDraft,
  outreachDraftContentSchema,
  outreachDraftRestoreSchema,
  outreachDraftTransitionSchema,
} from "@/features/outreach/domain/outreach-draft-lifecycle";

const draftId = "00000000-0000-4000-8000-000000000001";

describe("Outreach draft lifecycle", () => {
  it("allows only explicit lifecycle transitions", () => {
    expect(canTransitionDraft("draft", "approved")).toBe(true);
    expect(canTransitionDraft("rejected", "draft")).toBe(true);
    expect(canTransitionDraft("approved", "draft")).toBe(false);
    expect(canTransitionDraft("archived", "draft")).toBe(false);
  });

  it("limits review authority while allowing members to edit", () => {
    expect(canReviewOutreach("owner")).toBe(true);
    expect(canReviewOutreach("admin")).toBe(true);
    expect(canReviewOutreach("member")).toBe(false);
    expect(canEditOutreach("member")).toBe(true);
  });

  it("trims and validates versioned content", () => {
    const parsed = outreachDraftContentSchema.parse({
      draftId,
      expectedVersion: "2",
      subject: "  Hello  ",
      body: "  Message  ",
    });
    expect(parsed).toMatchObject({ expectedVersion: 2, subject: "Hello", body: "Message" });
    expect(outreachDraftContentSchema.safeParse({ ...parsed, body: " " }).success).toBe(false);
  });

  it("requires a bounded rejection reason", () => {
    const base = { draftId, expectedVersion: 1 };
    expect(outreachDraftTransitionSchema.safeParse({ ...base, transition: "reject" }).success).toBe(
      false,
    );
    expect(
      outreachDraftTransitionSchema.safeParse({
        ...base,
        transition: "reject",
        reason: "Needs a clearer CTA",
      }).success,
    ).toBe(true);
    expect(
      outreachDraftTransitionSchema.safeParse({
        ...base,
        transition: "reject",
        reason: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("validates restore concurrency inputs", () => {
    expect(
      outreachDraftRestoreSchema.safeParse({ draftId, expectedVersion: 3, versionNumber: 1 })
        .success,
    ).toBe(true);
    expect(
      outreachDraftRestoreSchema.safeParse({ draftId: "bad", expectedVersion: 0, versionNumber: 1 })
        .success,
    ).toBe(false);
  });
});
