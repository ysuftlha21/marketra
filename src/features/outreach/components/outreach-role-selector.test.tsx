import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OutreachRoleSelector } from "@/features/outreach/components/outreach-role-selector";
import { getApprovedRoles, getDefaultRole } from "@/features/outreach/components/outreach-types";
import type { CompanyDecisionRoleRow } from "@/features/companies/repository/decision-role-repository";

const baseRole = {
  workspace_id: "ws-1",
  project_id: "proj-1",
  company_id: "comp-1",
  source_run_id: "run-1",
  source_type: "generated" as const,
  role_family: "Engineering",
  department: "Tech",
  buying_role: "decision_maker",
  confidence_score: 85,
  reasoning: "Reason",
  evidence: {},
  likely_pain_points: [],
  likely_objections: [],
  recommended_message_angles: [],
  title_variants: [],
  seniority_levels: [],
  company_size_relevance: "High",
  country_relevance: "High",
  user_notes: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("OutreachRoleSelector component", () => {
  it("renders only approved roles and respects primary/secondary/fit score sorting with deterministic tie-breaking", () => {
    const rawRoles: CompanyDecisionRoleRow[] = [
      {
        ...baseRole,
        id: "role-2",
        role_title: "Role B",
        status: "approved",
        is_primary: false,
        is_secondary: false,
        priority: "supporting",
        fit_score: 80,
        role_key: "b",
      },
      {
        ...baseRole,
        id: "role-4",
        role_title: "Role D",
        status: "rejected",
        is_primary: false,
        is_secondary: false,
        priority: "supporting",
        fit_score: 99,
        role_key: "d",
      },
      {
        ...baseRole,
        id: "role-3",
        role_title: "Role C",
        status: "approved",
        is_primary: false,
        is_secondary: false,
        priority: "supporting",
        fit_score: 80,
        role_key: "c",
      }, // Same fit as Role B, should be sorted by ID (role-2 before role-3)
      {
        ...baseRole,
        id: "role-1",
        role_title: "Role A",
        status: "approved",
        is_primary: true,
        is_secondary: false,
        priority: "primary",
        fit_score: 70,
        role_key: "a",
      },
      {
        ...baseRole,
        id: "role-5",
        role_title: "Role E",
        status: "suggested",
        is_primary: false,
        is_secondary: false,
        priority: "supporting",
        fit_score: 99,
        role_key: "e",
      },
      {
        ...baseRole,
        id: "role-6",
        role_title: "Role F",
        status: "archived",
        is_primary: false,
        is_secondary: false,
        priority: "supporting",
        fit_score: 99,
        role_key: "f",
      },
      {
        ...baseRole,
        id: "role-7",
        role_title: "Role G",
        status: "approved",
        is_primary: false,
        is_secondary: true,
        priority: "secondary",
        fit_score: 60,
        role_key: "g",
      },
    ];
    const approvedRoles = getApprovedRoles(rawRoles);

    // Sort order should be: primary (role-1), secondary (role-7), highest fit (role-2, role-3 by ID)
    render(
      <OutreachRoleSelector
        roles={approvedRoles}
        selectedRole={getDefaultRole(approvedRoles)}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox", {
      name: /decision maker role/i,
    }) as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    const options = Array.from(select.options);
    // 5 options total: 1 disabled default placeholder + 4 approved roles
    expect(options).toHaveLength(5);
    expect(options[1]!.value).toBe("role-1");
    expect(options[2]!.value).toBe("role-7");
    expect(options[3]!.value).toBe("role-2");
    expect(options[4]!.value).toBe("role-3");

    // The actual selected option shown to the user is the primary one
    expect(select.value).toBe("role-1");

    // Notice is visible
    expect(
      screen.getByText(/These are recommended role targets based on available/i),
    ).toBeInTheDocument();
  });
});
