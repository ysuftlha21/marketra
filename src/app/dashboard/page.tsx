import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { DashboardStateOverview } from "@/features/dashboard/components/dashboard-state-overview";
import { getAuthContext } from "@/lib/auth/session";
import { getDashboardViewModel } from "@/features/dashboard/services/dashboard-service";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";

export const metadata = { title: "Overview" };

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  if (params.demo === "1")
    return (
      <>
        <div className="mb-2 flex justify-end">
          <a
            href="/dashboard"
            className="rounded-md border border-violet-400/30 px-3 py-1 text-[9px] text-violet-300"
          >
            Demo data · Exit demo
          </a>
        </div>
        <DashboardOverview />
      </>
    );
  const context = await getAuthContext();
  if (!context?.activeWorkspace) return null;
  let model;
  try {
    const projectContext = await resolveAuthenticatedProjectContext();
    model = await getDashboardViewModel(
      {
        id: context.activeWorkspace.workspace.id,
        name: context.activeWorkspace.workspace.name,
      },
      projectContext.project?.id,
    );
  } catch {
    return (
      <div className="marketra-panel mx-auto mt-16 max-w-lg p-8 text-center">
        <h1 className="text-lg font-semibold">We couldn’t load your dashboard.</h1>
        <p className="mt-2 text-sm text-zinc-500">Please try again.</p>
        <a
          href="/dashboard"
          className="mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm"
        >
          Try again
        </a>
      </div>
    );
  }
  return <DashboardStateOverview model={model} />;
}
