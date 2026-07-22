"use client";

import {
  LayoutDashboard,
  FolderKanban,
  Globe,
  Building2,
  Mail,
  KanbanSquare,
  Settings,
  Users,
  PenLine,
  Megaphone,
  ChartNoAxesCombined,
  SlidersHorizontal,
  CreditCard,
  ListChecks,
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
  Users,
  PenLine,
  Megaphone,
  ChartNoAxesCombined,
  SlidersHorizontal,
  CreditCard,
  ListChecks,
};

export function DashboardIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}
