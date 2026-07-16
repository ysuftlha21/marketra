import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, "Workspace name must be at least 2 characters")
  .max(60, "Workspace name must be 60 characters or fewer");

export const workspaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, "Slug must be lowercase, alphanumeric, and use single hyphens")
  .min(2, "Slug must be at least 2 characters")
  .max(40, "Slug must be 40 characters or fewer");

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "app",
  "dashboard",
  "settings",
  "marketra",
  "new",
  "create",
  "onboarding",
  "sign-in",
  "sign-up",
  "www",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function slugifyWorkspaceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function normalizeSlug(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, "-");
}
