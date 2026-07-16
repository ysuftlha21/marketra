"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { DashboardIcon } from "./dashboard-icon";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ChevronsLeft } from "lucide-react";

const primaryNavigation = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Markets", href: "/dashboard/markets", icon: "Globe" },
  { label: "Company Discovery", href: "/dashboard/companies", icon: "Building2" },
  { label: "Buyer Discovery", href: "/dashboard/companies", icon: "Users" },
  { label: "ICP Builder", href: "/dashboard/projects", icon: "PenLine" },
  { label: "AI Outreach", href: "/dashboard/outreach", icon: "Mail" },
  { label: "Campaigns", href: "/dashboard/crm", icon: "Megaphone", legacyLabel: "CRM" },
  { label: "Analytics", href: "/dashboard", icon: "ChartNoAxesCombined" },
] as const;

const secondaryNavigation = [
  { label: "Integrations", href: "/dashboard/settings", icon: "SlidersHorizontal" },
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
            const active = itemIndex === 0 && groupIndex === 0 && pathname === "/dashboard";
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
                {!collapsed && (
                  <span className="truncate">
                    {item.label}
                    {"legacyLabel" in item && <span className="sr-only"> {item.legacyLabel}</span>}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      {!collapsed && (
        <div className="mt-auto rounded-lg border border-white/[.06] bg-gradient-to-b from-[#111623] to-[#0d111b] p-3">
          <p className="text-[11px] font-medium text-zinc-200">Pro Plan</p>
          <div className="mt-4 flex justify-between text-[9px] text-zinc-500">
            <span>Usage this month</span>
            <span>78%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
            <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-violet-600 to-violet-400" />
          </div>
          <Link
            href="/pricing"
            className="mt-3 grid h-7 w-full place-items-center rounded-md bg-white/[.04] text-[9px] text-zinc-300 hover:bg-violet-500/10"
          >
            Upgrade Plan
          </Link>
        </div>
      )}
      {!collapsed && (
        <button
          type="button"
          onClick={onCollapse}
          className="mt-8 flex items-center gap-2 px-2 text-[11px] text-zinc-500 hover:text-zinc-200"
        >
          <ChevronsLeft className="h-4 w-4" /> Collapse
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
