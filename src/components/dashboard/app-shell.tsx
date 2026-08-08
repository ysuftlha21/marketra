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
  PanelLeftOpen,
  Search,
  Bell,
  Building2,
} from "lucide-react";
import { Brand, SidebarNav } from "./sidebar-nav";
import { signOutAction } from "@/features/auth/api/auth-actions";
import { switchWorkspaceAction } from "@/features/workspaces/api/workspace-actions";
import { cn } from "@/lib/utils/cn";
import type { WorkspaceRole } from "@/features/workspaces/domain/roles";
import { switchProjectAction } from "@/features/projects/api/project-actions";

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
  activeProject?: { id: string; name: string; slug: string } | null;
  projects?: Array<{ id: string; name: string; slug: string }>;
}
interface AppShellProps {
  context: AppShellContext;
  sidebarCollapsed?: boolean;
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

function formatRole(role: WorkspaceRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function WorkspaceSwitcher({
  context,
  menuPlacement = "down",
}: {
  context: AppShellContext;
  menuPlacement?: "up" | "down";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function switchTo(id: string) {
    setOpen(false);
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("workspaceId", id);
      const result = await switchWorkspaceAction(formData);
      if (result.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Workspace could not be changed. Please try again.");
        setOpen(true);
      }
    } catch {
      setError("Workspace could not be changed. Please try again.");
      setOpen(true);
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
        aria-busy={pending}
        disabled={pending || context.workspaces.length <= 1}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 max-w-[160px] items-center gap-1.5 rounded-md border border-border/60 bg-surface px-2.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
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
          className={cn(
            "absolute right-0 z-50 w-52 rounded-lg border border-border/60 bg-surface py-1 shadow-lg",
            menuPlacement === "up" ? "bottom-full mb-1" : "mt-1",
          )}
        >
          {context.workspaces.map((w) => (
            <button
              key={w.id}
              type="button"
              role="menuitemradio"
              aria-checked={w.id === context.activeWorkspace.id}
              onClick={() => switchTo(w.id)}
              className={cn(
                "flex min-h-10 w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400",
                w.id === context.activeWorkspace.id
                  ? "text-primary font-medium"
                  : "text-foreground",
              )}
            >
              <span className="truncate">{w.name}</span>
              <span className="text-xs text-muted-foreground">{w.role}</span>
            </button>
          ))}
          {error && (
            <p role="alert" className="border-t border-border px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}
        </div>
      )}
      {pending && <span className="sr-only">Changing workspace…</span>}
    </div>
  );
}

function ProjectSwitcher({
  context,
  mobile = false,
}: {
  context: AppShellContext;
  mobile?: boolean;
}) {
  const router = useRouter();
  const projects = context.projects ?? [];
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  const activeProject = context.activeProject;
  if (!activeProject || projects.length === 0) return null;
  const pending = pendingSlug !== null;

  return (
    <label className={cn("items-center", mobile ? "flex w-full" : "hidden sm:flex")}>
      <span className="sr-only">Active project</span>
      <select
        aria-label="Active project"
        aria-busy={pending}
        disabled={pending}
        value={pendingSlug ?? activeProject.slug}
        onChange={async (event) => {
          const nextSlug = event.target.value;
          setPendingSlug(nextSlug);
          setError(false);
          const formData = new FormData();
          formData.set("projectSlug", nextSlug);
          try {
            const result = await switchProjectAction(formData);
            if (result.ok) {
              router.push("/dashboard");
              router.refresh();
            } else {
              setError(true);
            }
          } catch {
            setError(true);
          } finally {
            setPendingSlug(null);
          }
        }}
        className={cn(
          "h-8 rounded-md border border-white/[.08] bg-[#0b0f19] px-2 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60",
          mobile ? "w-full" : "max-w-44",
        )}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.slug}>
            {project.name}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="sr-only">
          Project could not be changed.
        </span>
      )}
    </label>
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
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors duration-150 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
            className="flex min-h-10 items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
          >
            <UserIcon className="h-4 w-4 text-muted-foreground" /> Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={pending}
            className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400 disabled:cursor-wait disabled:opacity-60"
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
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const mobileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const mobilePanelRef = React.useRef<HTMLElement>(null);

  const toggleCollapse = React.useCallback(() => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    // sidebar:state=true means COLLAPSED (matches the stored boolean)
    document.cookie = `sidebar:state=${newVal}; path=/; max-age=31536000; samesite=lax`;
  }, [isCollapsed]);

  // Keyboard shortcut: Ctrl+B
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        toggleCollapse();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => document.getElementById("dashboard-search")?.focus(), 0);
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [mobileOpen, toggleCollapse]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const panel = mobilePanelRef.current;
    const trigger = mobileTriggerRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();
    document.body.style.overflow = "hidden";

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="dark marketra-dashboard-shell flex min-h-screen bg-[#070a12] text-zinc-100">
      {/* Desktop sidebar */}
      <aside
        id="dashboard-sidebar"
        data-state={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "hidden shrink-0 border-r border-white/[.055] bg-[#080b13] transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col",
          isCollapsed ? "w-16" : "w-[196px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-white/[.035] transition-all duration-200",
            isCollapsed ? "px-0 justify-center" : "px-5",
          )}
        >
          <Brand collapsed={isCollapsed} />
        </div>
        <SidebarNav collapsed={isCollapsed} onCollapse={toggleCollapse} />
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
            aria-hidden="true"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            ref={mobilePanelRef}
            id="dashboard-mobile-navigation"
            className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Brand />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto border-t border-border px-4 py-3">
              <div className="mb-2">
                <ProjectSwitcher context={context} mobile />
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <Building2 className="h-4 w-4 shrink-0 text-violet-400" />
                <WorkspaceSwitcher context={context} menuPlacement="up" />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[.055] bg-[#080b13]/95 px-4 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={mobileTriggerRef}
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="dashboard-mobile-navigation"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            {isCollapsed && (
              <button
                type="button"
                id="sidebar-open"
                aria-label="Open sidebar"
                aria-expanded={false}
                aria-controls="dashboard-sidebar"
                title="Open sidebar"
                onClick={toggleCollapse}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[.08] bg-[#0b0f19] text-zinc-400 transition-colors hover:bg-white/[.05] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 lg:inline-flex"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <label className="relative hidden h-9 w-[330px] items-center gap-2 rounded-lg border border-white/[.055] bg-[#090d16] px-3 text-zinc-500 focus-within:border-violet-500/40 md:flex">
              <Search className="h-4 w-4" />
              <input
                id="dashboard-search"
                aria-label="Search dashboard"
                placeholder="Search current workspace..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-600"
              />
              <kbd className="rounded bg-white/[.04] px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
              {searchOpen && (
                <div className="absolute left-0 top-10 z-50 w-full rounded-lg border border-white/[.08] bg-[#0d111c] p-2 shadow-xl">
                  <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    Quick search
                  </p>
                  {[context.activeWorkspace.name]
                    .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <Link
                        key={item}
                        href="/dashboard"
                        onClick={() => setSearchOpen(false)}
                        className="block min-h-10 w-full rounded px-2 py-2 text-left text-xs text-zinc-300 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        {item}
                      </Link>
                    ))}
                  {searchQuery &&
                    !context.activeWorkspace.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) && (
                      <p className="px-2 py-3 text-xs text-zinc-500" role="status">
                        No matching workspace data.
                      </p>
                    )}
                </div>
              )}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <ProjectSwitcher context={context} />
            <span className="hidden h-8 items-center gap-2 rounded-md border border-white/[.055] bg-[#0b0f19] px-2 lg:flex">
              <Building2 className="h-4 w-4 text-violet-400" />
              <WorkspaceSwitcher context={context} />
            </span>
            <button
              type="button"
              aria-label="Notifications, 3 unread"
              className="relative grid h-10 w-10 place-items-center rounded-full text-zinc-400 hover:bg-white/[.04] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Bell className="h-4 w-4" />
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 text-[9px] text-white"
              >
                3
              </span>
            </button>
            <UserMenu context={context} />
            <div className="hidden min-w-16 xl:block">
              <p className="truncate text-[11px] font-medium">
                {context.user.displayName || "User"}
              </p>
              <p className="text-[10px] text-zinc-500">
                {formatRole(context.activeWorkspace.role)}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden bg-[#070a12] p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
