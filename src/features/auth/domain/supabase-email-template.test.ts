import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const documentation = readFileSync(
  resolve(process.cwd(), "docs/supabase-email-templates.md"),
  "utf8",
);

describe("Supabase signup email template documentation", () => {
  it("documents the supported token hash and signup metadata variables", () => {
    expect(documentation).toContain("{{ .TokenHash }}");
    expect(documentation).toContain("{{ .Data.display_name }}");
    expect(documentation).toContain("{{ .ConfirmationURL }}");
  });

  it("does not use template filters or conditional helper syntax in production HTML", () => {
    const html = documentation.match(/```html\s*([\s\S]*?)```/)?.[1];

    expect(html).toBeDefined();
    expect(html).not.toMatch(/{{[^}]*\|[^}]*}}/);
    expect(html).not.toMatch(/{{\s*(?:if|else|end)\b/);
  });
});
