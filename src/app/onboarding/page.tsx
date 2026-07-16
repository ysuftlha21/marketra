import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/sign-in?next=/onboarding");
  if (ctx.activeWorkspace) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <CreateWorkspaceForm />
      </main>
    </div>
  );
}
