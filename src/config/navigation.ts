import { z } from "zod";

export const dashboardNavItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().min(1),
  description: z.string().optional(),
});
export type DashboardNavItem = z.infer<typeof dashboardNavItemSchema>;

export const dashboardNavigation: readonly DashboardNavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "LayoutDashboard",
    description: "Workspace summary and recent activity",
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: "FolderKanban",
    description: "Manage your SaaS products",
  },
  {
    label: "Markets",
    href: "/dashboard/markets",
    icon: "Globe",
    description: "Target countries and market analysis",
  },
  {
    label: "Companies",
    href: "/dashboard/companies",
    icon: "Building2",
    description: "Discover and score matching companies",
  },
  {
    label: "Outreach",
    href: "/dashboard/outreach",
    icon: "Mail",
    description: "Generate localized outreach",
  },
  {
    label: "CRM",
    href: "/dashboard/crm",
    icon: "KanbanSquare",
    description: "Track companies and activities",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "Settings",
    description: "Workspace, billing, and team",
  },
] as const;

export const marketingNavSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type MarketingNavItem = z.infer<typeof marketingNavSchema>;

export const marketingNavigation: readonly MarketingNavItem[] = [
  { label: "Product", href: "/#product" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
] as const;
