import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const subscriptionSql = readFileSync(
  "supabase/migrations/0033_workspace_subscriptions.sql",
  "utf8",
);
const usageSql = readFileSync("supabase/migrations/0034_ai_usage_events.sql", "utf8");

describe("Phase 9 migration security contract", () => {
  it.each([
    ["workspace subscriptions", subscriptionSql],
    ["AI usage events", usageSql],
  ])("enables RLS and denies anonymous access for %s", (_name, sql) => {
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/revoke all .* from anon/i);
    expect(sql).toMatch(/workspace_id/i);
  });

  it("never stores prompts or generated message bodies in AI accounting", () => {
    expect(usageSql).not.toMatch(/\bprompt\b/i);
    expect(usageSql).not.toMatch(/message_body|outreach_body/i);
  });

  it("exposes subscription state only through an RLS-invoker safe projection", () => {
    expect(subscriptionSql).toMatch(
      /create view public\.workspace_subscription_states\s+with \(security_invoker = true, security_barrier = true\)/i,
    );
    const viewProjection = subscriptionSql.match(
      /create view public\.workspace_subscription_states[\s\S]*?from public\.workspace_subscriptions;/i,
    )?.[0];
    expect(viewProjection).toBeDefined();
    expect(viewProjection).not.toMatch(/external_customer_id|external_subscription_id/i);
    expect(subscriptionSql).toMatch(
      /revoke all on public\.workspace_subscriptions from authenticated/i,
    );
    expect(subscriptionSql).toMatch(
      /grant select \([\s\S]*?\) on public\.workspace_subscriptions to authenticated/i,
    );
    const authenticatedColumns = subscriptionSql.match(
      /grant select \(([\s\S]*?)\) on public\.workspace_subscriptions to authenticated/i,
    )?.[1];
    expect(authenticatedColumns).not.toMatch(/external_customer_id|external_subscription_id/i);
    expect(subscriptionSql).toMatch(
      /grant select, insert, update, delete on public\.workspace_subscriptions to service_role/i,
    );
  });

  it("enforces project and workspace consistency with a composite foreign key", () => {
    expect(usageSql).toMatch(
      /create unique index projects_workspace_id_id_unique_idx\s+on public\.projects\(workspace_id, id\)/i,
    );
    expect(usageSql).toMatch(
      /foreign key \(workspace_id, project_id\)\s+references public\.projects\(workspace_id, id\)\s+on delete set null \(project_id\)/i,
    );
    expect(usageSql).not.toMatch(/project_id uuid references public\.projects\(id\)/i);
  });

  it("does not grant authenticated users insert access to AI usage", () => {
    expect(usageSql).toMatch(/grant select on public\.ai_usage_events to authenticated/i);
    expect(usageSql).not.toMatch(/grant .*insert.*ai_usage_events to authenticated/i);
  });
});
