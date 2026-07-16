import { describe, it, expect } from "vitest";
import {
  getApprovedRoles,
  getDefaultRole,
  getValidMessageTypes,
  getDefaultMessageType,
  OUTREACH_CHANNELS,
  OUTREACH_MESSAGE_TYPES,
  OUTREACH_TONES,
  OUTREACH_LENGTHS,
  OUTREACH_LANGUAGES,
  type ApprovedRoleOption,
} from "@/features/outreach/components/outreach-types";

function makeRole(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "role-1",
    workspace_id: "ws-1",
    project_id: "proj-1",
    company_id: "comp-1",
    source_run_id: "run-1",
    source_type: "generated",
    role_key: "cto",
    role_title: "CTO",
    role_family: "Engineering",
    department: "Technology",
    buying_role: "decision_maker",
    priority: "primary",
    fit_score: 90,
    confidence_score: 85,
    reasoning: "Test role",
    evidence: {},
    likely_pain_points: ["Pain 1"],
    likely_objections: ["Obj 1"],
    recommended_message_angles: ["Angle 1"],
    title_variants: [],
    seniority_levels: [],
    company_size_relevance: "High",
    country_relevance: "High",
    status: "approved",
    is_primary: false,
    is_secondary: false,
    user_notes: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getApprovedRoles", () => {
  it("filters out suggested roles", () => {
    const roles = [
      makeRole({ id: "1", status: "approved", is_primary: true, fit_score: 90 }),
      makeRole({ id: "2", status: "suggested", fit_score: 95 }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    const result = getApprovedRoles(roles);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });

  it("filters out rejected roles", () => {
    const roles = [
      makeRole({ id: "1", status: "approved", fit_score: 50 }),
      makeRole({ id: "2", status: "rejected", fit_score: 95 }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    const result = getApprovedRoles(roles);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });

  it("filters out archived roles", () => {
    const roles = [
      makeRole({ id: "1", status: "archived", fit_score: 95 }),
      makeRole({ id: "2", status: "approved", fit_score: 50 }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    const result = getApprovedRoles(roles);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("2");
  });

  it("orders primary first", () => {
    const roles = [
      makeRole({ id: "a", status: "approved", is_primary: false, fit_score: 95 }),
      makeRole({ id: "b", status: "approved", is_primary: true, fit_score: 50 }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    const result = getApprovedRoles(roles);
    expect(result[0]!.id).toBe("b");
    expect(result[1]!.id).toBe("a");
  });

  it("orders secondary after primary", () => {
    const roles = [
      makeRole({ id: "s", status: "approved", is_secondary: true, fit_score: 50 }),
      makeRole({ id: "p", status: "approved", is_primary: true, fit_score: 50 }),
      makeRole({ id: "r", status: "approved", fit_score: 90 }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    const result = getApprovedRoles(roles);
    expect(result[0]!.id).toBe("p");
    expect(result[1]!.id).toBe("s");
    expect(result[2]!.id).toBe("r");
  });

  it("orders remaining by fit score descending", () => {
    const roles = [
      makeRole({ id: "low", status: "approved", fit_score: 40 }),
      makeRole({ id: "high", status: "approved", fit_score: 80 }),
      makeRole({ id: "mid", status: "approved", fit_score: 60 }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    const result = getApprovedRoles(roles);
    expect(result[0]!.id).toBe("high");
    expect(result[1]!.id).toBe("mid");
    expect(result[2]!.id).toBe("low");
  });

  it("returns empty array when no approved roles", () => {
    const roles = [
      makeRole({ id: "1", status: "suggested" }),
      makeRole({ id: "2", status: "rejected" }),
    ] as unknown as Parameters<typeof getApprovedRoles>[0];
    expect(getApprovedRoles(roles)).toHaveLength(0);
  });
});

describe("getDefaultRole", () => {
  it("returns null for empty roles", () => {
    expect(getDefaultRole([])).toBeNull();
  });

  it("returns primary role when available", () => {
    const roles: ApprovedRoleOption[] = [
      {
        id: "1",
        title: "CTO",
        buyingRole: "decision_maker",
        priority: "primary",
        isPrimary: true,
        isSecondary: false,
        department: "Tech",
        fitScore: 90,
      },
      {
        id: "2",
        title: "CEO",
        buyingRole: "decision_maker",
        priority: "primary",
        isPrimary: false,
        isSecondary: false,
        department: "Exec",
        fitScore: 95,
      },
    ];
    expect(getDefaultRole(roles)?.id).toBe("1");
  });

  it("returns secondary when no primary", () => {
    const roles: ApprovedRoleOption[] = [
      {
        id: "1",
        title: "CTO",
        buyingRole: "decision_maker",
        priority: "secondary",
        isPrimary: false,
        isSecondary: true,
        department: "Tech",
        fitScore: 90,
      },
      {
        id: "2",
        title: "CEO",
        buyingRole: "decision_maker",
        priority: "supporting",
        isPrimary: false,
        isSecondary: false,
        department: "Exec",
        fitScore: 95,
      },
    ];
    expect(getDefaultRole(roles)?.id).toBe("1");
  });

  it("returns highest fit when no primary/secondary", () => {
    // getDefaultRole expects pre-sorted input from getApprovedRoles (fit desc).
    const roles: ApprovedRoleOption[] = [
      {
        id: "high",
        title: "B",
        buyingRole: "influencer",
        priority: "supporting",
        isPrimary: false,
        isSecondary: false,
        department: "Y",
        fitScore: 85,
      },
      {
        id: "low",
        title: "A",
        buyingRole: "influencer",
        priority: "low",
        isPrimary: false,
        isSecondary: false,
        department: "X",
        fitScore: 30,
      },
    ];
    expect(getDefaultRole(roles)?.id).toBe("high");
  });
});

describe("CHANNEL_MESSAGE_TYPE_MAP", () => {
  it("email supports initial_contact, meeting_request, follow_up, re_engagement", () => {
    expect(getValidMessageTypes("email")).toEqual([
      "initial_contact",
      "meeting_request",
      "follow_up",
      "re_engagement",
    ]);
  });

  it("linkedin_connection only supports connection_request", () => {
    expect(getValidMessageTypes("linkedin_connection")).toEqual(["connection_request"]);
  });

  it("linkedin_message supports initial_contact, meeting_request, re_engagement", () => {
    expect(getValidMessageTypes("linkedin_message")).toEqual([
      "initial_contact",
      "meeting_request",
      "re_engagement",
    ]);
  });

  it("follow_up channel only supports follow_up", () => {
    expect(getValidMessageTypes("follow_up")).toEqual(["follow_up"]);
  });

  it("returns empty for unknown channel", () => {
    expect(getValidMessageTypes("sms")).toEqual([]);
  });
});

describe("getDefaultMessageType", () => {
  it("returns first valid type for email", () => {
    expect(getDefaultMessageType("email")).toBe("initial_contact");
  });

  it("returns connection_request for linkedin_connection", () => {
    expect(getDefaultMessageType("linkedin_connection")).toBe("connection_request");
  });

  it("returns initial_contact for unknown channel", () => {
    expect(getDefaultMessageType("sms")).toBe("initial_contact");
  });
});

describe("OUTREACH constants", () => {
  it("all channels have labels", () => {
    expect(OUTREACH_CHANNELS).toHaveLength(4);
    OUTREACH_CHANNELS.forEach((c) => expect(c.label).toBeTruthy());
  });

  it("all message types have labels", () => {
    expect(OUTREACH_MESSAGE_TYPES).toHaveLength(5);
  });

  it("all tones have labels", () => {
    expect(OUTREACH_TONES).toHaveLength(5);
  });

  it("all lengths have labels", () => {
    expect(OUTREACH_LENGTHS).toHaveLength(3);
  });

  it("all languages have labels", () => {
    expect(OUTREACH_LANGUAGES).toHaveLength(2);
  });
});
