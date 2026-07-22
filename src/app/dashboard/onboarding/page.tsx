import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { requireWorkspace } from "@/lib/auth/session";
import { getOnboardingProgress } from "@/features/onboarding/services/onboarding-service";
import type { OnboardingStepId } from "@/features/onboarding/domain/onboarding-progress";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const LABELS: Record<OnboardingStepId, string> = {
  workspace: "Create your workspace",
  project: "Create a project and add product information",
  market: "Select a target market",
  company: "Add a company manually or through discovery",
  decision_role: "Generate a Decision Role",
  outreach: "Generate an Outreach draft",
};
const ORDER = Object.keys(LABELS) as OnboardingStepId[];

export default async function DashboardOnboardingPage() {
  const workspace = await requireWorkspace();
  const progress = await getOnboardingProgress(workspace.workspace.id);
  const projectBase = progress.project
    ? `/dashboard/projects/${progress.project.slug}`
    : "/dashboard/projects/new";
  const marketBase =
    progress.market && progress.project
      ? `${projectBase}/markets/${progress.market.country_code}`
      : `${projectBase}/markets`;
  const hrefs: Record<OnboardingStepId, string> = {
    workspace: "/dashboard/settings",
    project: "/dashboard/projects/new",
    market: `${projectBase}/markets`,
    company: `${marketBase}/discovery`,
    decision_role: `${marketBase}/discovery`,
    outreach: "/dashboard/outreach",
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Getting started"
        title="Reach your first useful result"
        description={`${progress.completed.size} of ${progress.total} steps complete. Progress is derived from saved workspace data.`}
      />
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {ORDER.map((step) => {
            const done = progress.completed.has(step);
            return (
              <div key={step} className="flex items-center gap-3 p-4">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="flex-1 text-sm">{LABELS[step]}</span>
                {!done && progress.nextStep === step && (
                  <Link href={hrefs[step]} className={buttonVariants({ size: "sm" })}>
                    Continue
                  </Link>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
