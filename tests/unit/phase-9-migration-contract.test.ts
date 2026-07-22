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
});
