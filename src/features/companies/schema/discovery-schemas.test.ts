import { describe, expect, it } from "vitest";
import { readOptionalDiscoveryText, startDiscoverySchema } from "./discovery-schemas";

const base = {
  projectSlug: "marketra",
  targetCountryId: "00000000-0000-4000-a000-000000000001",
};

describe("startDiscoverySchema keyword matching", () => {
  it("defaults to any and permits an empty keyword input", () => {
    expect(startDiscoverySchema.parse(base)).toMatchObject({ keywordMatchMode: "any" });
  });

  it("accepts explicit all and rejects unsupported modes", () => {
    expect(startDiscoverySchema.parse({ ...base, keywordMatchMode: "all" })).toMatchObject({
      keywordMatchMode: "all",
    });
    expect(
      startDiscoverySchema.safeParse({ ...base, keywordMatchMode: "unsupported" }).success,
    ).toBe(false);
  });
});

describe("readOptionalDiscoveryText", () => {
  it("distinguishes an absent field from an explicitly cleared field", () => {
    const formData = new FormData();
    expect(readOptionalDiscoveryText(formData, "keywords")).toBeUndefined();
    formData.set("keywords", "");
    expect(readOptionalDiscoveryText(formData, "keywords")).toBe("");
  });
});
