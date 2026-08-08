import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { DashboardStateOverview } from "@/features/dashboard/components/dashboard-state-overview";
import { getAuthContext } from "@/lib/auth/session";
import { getDashboardViewModel } from "@/features/dashboard/services/dashboard-service";
import {
  getRecommendedProjectAction,
  resolveAuthenticatedProjectContext,
} from "@/features/projects/services/project-context-service";

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
            className="rounded-md border border-violet-400/30 px-3 py-1.5 text-xs text-violet-300 transition-colors duration-150 hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
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
    model = { ...model, nextSteps: [getRecommendedProjectAction(projectContext)] };
  } catch {
    return (
      <div className="marketra-panel mx-auto mt-16 max-w-lg p-8 text-center" role="alert">
        <h1 className="text-lg font-semibold">We couldn’t load your dashboard.</h1>
        <p className="mt-2 text-sm text-zinc-500">Please try again.</p>
        <a
          href="/dashboard"
          className="mt-5 inline-flex min-h-10 items-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          Try again
        </a>
      </div>
    );
  }
  return <DashboardStateOverview model={model} />;
}
