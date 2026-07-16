"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  User as UserIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Brand, SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOutAction } from "@/features/auth/api/auth-actions";
import { switchWorkspaceAction } from "@/features/workspaces/api/workspace-actions";
import { cn } from "@/lib/utils/cn";
import type { WorkspaceRole } from "@/features/workspaces/domain/roles";

export interface AppShellWorkspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}
export interface AppShellContext {
  user: { email: string; displayName: string };
  activeWorkspace: AppShellWorkspace;
  workspaces: AppShellWorkspace[];
}
interface AppShellProps {
  context: AppShellContext;
  sidebarCollapsed?: boolean;
  title?: string;
  children: React.ReactNode;
}

function initials(name: string, email: string): string {
  const base = name || email;
  if (!base) return "U";
  const parts = base
    .trim()
    .split(/[\s@]+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  return (parts[0]![0] ?? "U").toUpperCase();
}

function WorkspaceSwitcher({ context }: { context: AppShellContext }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function switchTo(id: string) {
    setOpen(false);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("workspaceId", id);
      await switchWorkspaceAction(formData);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Switch workspace"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending || context.workspaces.length <= 1}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 max-w-[160px] items-center gap-1.5 rounded-md border border-border/60 bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
      >
        <span className="truncate">{context.activeWorkspace.name}</span>
        {context.workspaces.length > 1 && (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && context.workspaces.length > 1 && (
        <div
          role="menu"
          aria-label="Workspaces"
          className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-border/60 bg-surface py-1 shadow-lg"
        >
          {context.workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              role="menuitemradio"
              aria-checked={w.id === context.activeWorkspace.id}
              onClick={() => switchTo(w.id)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                w.id === context.activeWorkspace.id
                  ? "text-primary font-medium"
                  : "text-foreground",
              )}
            >
              <span className="truncate">{w.name}</span>
              <span className="text-xs text-muted-foreground">{w.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ context }: { context: AppShellContext }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function onSignOut() {
    setPending(true);
    try {
      await signOutAction();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
      >
        {initials(context.user.displayName, context.user.email)}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="User"
          className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-border/60 bg-surface py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">
              {context.user.displayName || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{context.user.email}</p>
          </div>
          <Link
            href="/dashboard/settings"
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <UserIcon className="h-4 w-4 text-muted-foreground" /> Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={pending}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppShell({
  context,
  sidebarCollapsed: initialCollapsed = false,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(initialCollapsed);

  const toggleCollapse = React.useCallback(() => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    // sidebar:state=true means COLLAPSED (matches the stored boolean)
    document.cookie = `sidebar:state=${newVal}; path=/; max-age=31536000; samesite=lax`;
  }, [isCollapsed]);

  // Keyboard shortcut: Ctrl+B
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapse]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        data-state={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "hidden shrink-0 border-r border-border bg-surface lg:flex lg:flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border transition-all",
            isCollapsed ? "px-0 justify-center" : "px-5",
          )}
        >
          <Brand collapsed={isCollapsed} />
        </div>
        <SidebarNav collapsed={isCollapsed} />
        <div className="mt-auto border-t border-border flex items-center justify-between px-3 py-2">
          {!isCollapsed && (
            <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">
              Workspace:{" "}
              <span className="font-medium text-foreground">{context.activeWorkspace.name}</span>
            </div>
          )}
          <button
            type="button"
            id="sidebar-toggle"
            onClick={toggleCollapse}
            aria-label="Toggle Sidebar"
            title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors mx-auto"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation"
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Brand />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <WorkspaceSwitcher context={context} />
            <ThemeToggle />
            <UserMenu context={context} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
