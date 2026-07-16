import { describe, it, expect } from "vitest";
import { slugifyProjectName, isUniqueSlug } from "./slug";

describe("slugifyProjectName", () => {
  it("converts to lowercase", () => {
    expect(slugifyProjectName("SupportFlow")).toBe("supportflow");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugifyProjectName("My SaaS App")).toBe("my-saas-app");
  });

  it("removes special characters", () => {
    expect(slugifyProjectName("Hello! World?")).toBe("hello-world");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugifyProjectName("  --Project--  ")).toBe("project");
  });

  it("collapses multiple hyphens", () => {
    expect(slugifyProjectName("My   Project")).toBe("my-project");
  });

  it("handles empty input", () => {
    expect(slugifyProjectName("")).toBe("untitled");
  });

  it("handles only special chars", () => {
    expect(slugifyProjectName("!!!")).toBe("untitled");
  });
});

describe("isUniqueSlug", () => {
  const slugs = ["my-project", "other-project"];

  it("returns true for new unique slug", () => {
    expect(isUniqueSlug("new-project", slugs)).toBe(true);
  });

  it("returns false for existing slug", () => {
    expect(isUniqueSlug("my-project", slugs)).toBe(false);
  });

  it("returns true when slug matches current", () => {
    expect(isUniqueSlug("my-project", slugs, "my-project")).toBe(true);
  });

  it("returns false for different-case existing slug", () => {
    expect(isUniqueSlug("my-project", ["my-project"])).toBe(false);
  });
});
