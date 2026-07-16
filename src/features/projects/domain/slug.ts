export function slugifyProjectName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "untitled"
  );
}

export function isUniqueSlug(slug: string, existingSlugs: string[], currentSlug?: string): boolean {
  if (currentSlug && slug === currentSlug) return true;
  return !existingSlugs.includes(slug);
}
