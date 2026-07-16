import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <ForgotPasswordForm />
      </main>
      <MarketingFooter />
    </div>
  );
}
