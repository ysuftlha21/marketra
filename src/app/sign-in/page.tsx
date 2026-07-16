import { MarketingHeader } from "@/components/marketing/marketing-header";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <SignInForm />
      </main>
    </div>
  );
}
