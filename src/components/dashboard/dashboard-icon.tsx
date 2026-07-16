"use client";

import {
  LayoutDashboard,
  FolderKanban,
  Globe,
  Building2,
  Mail,
  KanbanSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  Globe,
  Building2,
  Mail,
  KanbanSquare,
  Settings,
};

export function DashboardIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}
