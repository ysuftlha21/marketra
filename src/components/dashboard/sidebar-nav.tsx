"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { DashboardIcon } from "./dashboard-icon";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ChevronsLeft } from "lucide-react";

const primaryNavigation = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Projects", href: "/dashboard/projects", icon: "FolderKanban" },
  { label: "Markets", href: "/dashboard/markets", icon: "Globe" },
  { label: "Company Discovery", href: "/dashboard/companies", icon: "Building2" },
  { label: "Buyer Discovery", href: "/dashboard/buyers", icon: "Users" },
  { label: "ICP Builder", href: "/dashboard/icp", icon: "PenLine" },
  { label: "AI Outreach", href: "/dashboard/outreach", icon: "Mail" },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "Megaphone" },
  { label: "CRM", href: "/dashboard/crm", icon: "KanbanSquare" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "ChartNoAxesCombined" },
] as const;

const secondaryNavigation = [
  { label: "Getting started", href: "/dashboard/onboarding", icon: "ListChecks" },
  { label: "Integrations", href: "/dashboard/settings", icon: "SlidersHorizontal" },
  { label: "Billing", href: "/dashboard/settings/billing", icon: "CreditCard" },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings" },
] as const;

interface SidebarNavProps {
  onNavigate?: () => void;
  onCollapse?: () => void;
  collapsed?: boolean;
}

export function SidebarNav({ onNavigate, onCollapse, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col px-3 py-4">
      {[primaryNavigation, secondaryNavigation].map((group, groupIndex) => (
        <div
          key={groupIndex}
          className={cn("space-y-1", groupIndex === 1 && "mt-5 border-t border-white/[.035] pt-5")}
        >
          {group.map((item, itemIndex) => {
            const active =
              itemIndex === 0 && groupIndex === 0
                ? pathname === "/dashboard"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-10 items-center rounded-lg text-[12px] font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  active
                    ? "border border-violet-500/10 bg-violet-500/10 text-violet-400 shadow-[inset_0_0_18px_rgba(124,58,237,.06)]"
                    : "text-zinc-500 hover:bg-white/[.025] hover:text-zinc-200",
                )}
              >
                <DashboardIcon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
      {!collapsed && (
        <Link
          href="/dashboard/settings/billing"
          className="mt-auto rounded-lg border border-white/[.06] p-3 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          View billing and usage
        </Link>
      )}
      {!collapsed && onCollapse && (
        <button
          type="button"
          id="sidebar-toggle"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          aria-expanded={true}
          aria-controls="dashboard-sidebar"
          title="Collapse sidebar"
          className="mt-8 flex min-h-10 items-center gap-2 rounded-md px-2 text-[11px] text-zinc-500 transition-colors hover:bg-white/[.025] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" /> Collapse
        </button>
      )}
    </nav>
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <BrandLogo
      link
      variant={collapsed ? "mark" : "full"}
      size="md"
      theme="auto"
      className={cn("flex items-center", collapsed ? "justify-center" : "gap-2")}
    />
  );
}
