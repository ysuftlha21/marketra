import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata = { title: "Create account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string; trial?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <SignUpForm
          pricingIntent={{
            plan: params.plan,
            interval: params.interval,
            trial: params.trial === "true",
          }}
        />
      </main>
    </div>
  );
}
