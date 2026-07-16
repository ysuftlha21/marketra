"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";
import { DashboardIcon } from "./dashboard-icon";
import { BrandLogo } from "@/components/brand/brand-logo";

interface SidebarNavProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function SidebarNav({ onNavigate, collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1 px-3 py-4">
      {dashboardNavigation.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center rounded-md py-2 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <DashboardIcon name={item.icon} className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
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
