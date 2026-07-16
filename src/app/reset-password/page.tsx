import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <ResetPasswordForm />
      </main>
      <MarketingFooter />
    </div>
  );
}
