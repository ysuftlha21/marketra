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
  Search,
  Bell,
  Building2,
  Flag,
} from "lucide-react";
import { Brand, SidebarNav } from "./sidebar-nav";
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
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [countryOpen, setCountryOpen] = React.useState(false);
  const [country, setCountry] = React.useState("United States");

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => document.getElementById("dashboard-search")?.focus(), 0);
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [toggleCollapse]);

  return (
    <div className="dark marketra-dashboard-shell flex min-h-screen bg-[#070a12] text-zinc-100">
      {/* Desktop sidebar */}
      <aside
        data-state={isCollapsed ? "collapsed" : "expanded"}
        className={cn(
          "hidden shrink-0 border-r border-white/[.055] bg-[#080b13] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-[196px]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-white/[.035] transition-all",
            isCollapsed ? "px-0 justify-center" : "px-5",
          )}
        >
          <Brand collapsed={isCollapsed} />
        </div>
        <SidebarNav collapsed={isCollapsed} onCollapse={toggleCollapse} />
        <div className="hidden">
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[.055] bg-[#080b13]/95 px-4 backdrop-blur-sm">
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
            <label className="relative hidden h-9 w-[330px] items-center gap-2 rounded-lg border border-white/[.055] bg-[#090d16] px-3 text-zinc-500 focus-within:border-violet-500/40 md:flex">
              <Search className="h-4 w-4" />
              <input
                id="dashboard-search"
                aria-label="Search dashboard"
                placeholder="Search markets, companies, industries..."
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-zinc-600"
              />
              <kbd className="rounded bg-white/[.04] px-1.5 py-0.5 text-[8px]">⌘ K</kbd>
              {searchOpen && (
                <div className="absolute left-0 top-10 z-50 w-full rounded-lg border border-white/[.08] bg-[#0d111c] p-2 shadow-xl">
                  <p className="px-2 py-1 text-[8px] uppercase tracking-wider text-zinc-600">
                    Quick search
                  </p>
                  {[context.activeWorkspace.name]
                    .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="block w-full rounded px-2 py-2 text-left text-[10px] text-zinc-300 hover:bg-violet-500/10"
                      >
                        {item}
                      </button>
                    ))}
                  {searchQuery &&
                    !context.activeWorkspace.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) && (
                      <p className="px-2 py-3 text-[10px] text-zinc-500">
                        No matching workspace data.
                      </p>
                    )}
                </div>
              )}
            </label>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={countryOpen}
                onClick={() => setCountryOpen((value) => !value)}
                className="flex h-8 items-center gap-2 rounded-md border border-white/[.055] bg-[#0b0f19] px-3 text-[10px]"
              >
                <Flag className="h-4 w-4 text-red-400" /> {country}
                <ChevronDown className="h-3 w-3" />
              </button>
              {countryOpen && (
                <div
                  role="listbox"
                  aria-label="Country"
                  className="absolute right-0 top-10 z-50 w-40 rounded-lg border border-white/[.08] bg-[#0d111c] p-1 shadow-xl"
                >
                  {["United States", "Germany", "United Kingdom", "Canada", "Japan"].map((item) => (
                    <button
                      key={item}
                      role="option"
                      aria-selected={country === item}
                      type="button"
                      onClick={() => {
                        setCountry(item);
                        setCountryOpen(false);
                      }}
                      className="block w-full rounded px-2 py-2 text-left text-[10px] text-zinc-300 hover:bg-violet-500/10"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="hidden h-8 items-center gap-2 rounded-md border border-white/[.055] bg-[#0b0f19] px-2 lg:flex">
              <Building2 className="h-4 w-4 text-violet-400" />
              <WorkspaceSwitcher context={context} />
            </span>
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid h-8 w-8 place-items-center rounded-full text-zinc-500 hover:bg-white/[.04]"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 text-[8px] text-white">
                3
              </span>
            </button>
            <UserMenu context={context} />
            <div className="hidden min-w-16 xl:block">
              <p className="truncate text-[10px] font-medium">
                {context.user.displayName || "John J."}
              </p>
              <p className="text-[8px] text-zinc-600">Admin</p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden bg-[#070a12] p-3 sm:p-4">{children}</main>
      </div>
    </div>
  );
}
