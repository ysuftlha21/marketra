import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell, type AppShellContext } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/auth/api/auth-actions", () => ({ signOutAction: vi.fn() }));
vi.mock("@/features/workspaces/api/workspace-actions", () => ({ switchWorkspaceAction: vi.fn() }));
vi.mock("@/features/projects/api/project-actions", () => ({ switchProjectAction: vi.fn() }));

const context: AppShellContext = {
  user: { email: "owner@example.com", displayName: "Ada" },
  activeWorkspace: { id: "workspace-1", name: "Acme", slug: "acme", role: "owner" },
  workspaces: [{ id: "workspace-1", name: "Acme", slug: "acme", role: "owner" }],
};

function renderShell(collapsed = false) {
  render(
    <AppShell context={context} sidebarCollapsed={collapsed}>
      <div>Dashboard content</div>
    </AppShell>,
  );
}

describe("AppShell sidebar", () => {
  it("exposes distinct Projects, Campaigns and CRM routes", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "/dashboard/projects",
    );
    expect(screen.getByRole("link", { name: "Campaigns" })).toHaveAttribute(
      "href",
      "/dashboard/campaigns",
    );
    expect(screen.getByRole("link", { name: "CRM" })).toHaveAttribute("href", "/dashboard/crm");
    expect(screen.queryByRole("link", { name: "Integrations" })).not.toBeInTheDocument();
  });

  it("shows the authenticated workspace role and an accessible notification count", () => {
    renderShell();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });
  beforeEach(() => {
    document.cookie = "sidebar:state=; max-age=0; path=/";
  });

  it("starts open, collapses, reopens, and supports repeated cycles", () => {
    renderShell();
    const sidebar = document.getElementById("dashboard-sidebar");
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(sidebar).toHaveAttribute("data-state", "collapsed");
    expect(screen.getByRole("button", { name: "Open sidebar" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(document.cookie).toContain("sidebar:state=true");

    fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }));
    expect(sidebar).toHaveAttribute("data-state", "expanded");
    expect(screen.getByText("Dashboard content")).toBeVisible();
  });

  it("restores the server-provided persisted collapsed preference", () => {
    renderShell(true);
    expect(document.getElementById("dashboard-sidebar")).toHaveAttribute("data-state", "collapsed");
    expect(screen.getAllByRole("button", { name: "Open sidebar" })).toHaveLength(1);
  });

  it("keeps mobile navigation independent and closes it with Escape", () => {
    renderShell(true);
    const mobileToggle = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(mobileToggle);
    expect(screen.getByRole("dialog", { name: "Dashboard navigation" })).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.queryByRole("button", { name: "Collapse sidebar" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Dashboard navigation" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the workspace menu with Escape", () => {
    render(
      <AppShell
        context={{
          ...context,
          workspaces: [
            context.activeWorkspace,
            { id: "workspace-2", name: "Beta", slug: "beta", role: "member" },
          ],
        }}
      >
        <div>Dashboard content</div>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch workspace" }));
    expect(screen.getByRole("menu", { name: "Workspaces" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Workspaces" })).not.toBeInTheDocument();
  });

  it("renders the canonical active project selector on desktop and mobile", () => {
    render(
      <AppShell
        context={{
          ...context,
          activeProject: { id: "project-1", name: "Marketra", slug: "marketra" },
          projects: [{ id: "project-1", name: "Marketra", slug: "marketra" }],
        }}
      >
        <div>Dashboard content</div>
      </AppShell>,
    );
    expect(screen.getByRole("combobox", { name: "Active project" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getAllByRole("combobox", { name: "Active project" })).toHaveLength(2);
  });
});
