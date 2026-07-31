import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appDirectory = resolve(root, "src/app");
const publicDirectory = resolve(root, "public");
const layoutSource = readFileSync(resolve(appDirectory, "layout.tsx"), "utf8");

const expectedPngs = [
  { path: "icon-16x16.png", width: 16, height: 16 },
  { path: "icon-32x32.png", width: 32, height: 32 },
  { path: "apple-touch-icon.png", width: 180, height: 180 },
] as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

describe("App Router metadata branding", () => {
  it("ships valid local favicon files at the declared dimensions", () => {
    for (const icon of expectedPngs) {
      const path = resolve(publicDirectory, icon.path);
      expect(existsSync(path), `${icon.path} should exist`).toBe(true);
      const png = readFileSync(path);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(icon.width);
      expect(png.readUInt32BE(20)).toBe(icon.height);
    }

    const favicon = readFileSync(resolve(publicDirectory, "favicon.ico"));
    expect(favicon.readUInt16LE(0)).toBe(0);
    expect(favicon.readUInt16LE(2)).toBe(1);
    expect(favicon.readUInt16LE(4)).toBeGreaterThanOrEqual(3);
  });

  it("declares each favicon role once using valid root-local paths", () => {
    for (const path of [
      "/icon-16x16.png",
      "/icon-32x32.png",
      "/favicon.ico",
      "/apple-touch-icon.png",
    ]) {
      expect(layoutSource.match(new RegExp(path.replace(".", "\\."), "g"))).toHaveLength(1);
    }

    const iconDeclarations = sourceFiles(appDirectory).filter((path) =>
      /\bicons\s*:/.test(readFileSync(path, "utf8")),
    );
    expect(iconDeclarations).toEqual([resolve(appDirectory, "layout.tsx")]);
  });
});
