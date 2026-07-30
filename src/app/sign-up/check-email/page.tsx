import { MarketingHeader } from "@/components/marketing/marketing-header";
import { CheckEmailCard } from "@/features/auth/components/check-email-card";
import { maskEmail } from "@/features/auth/domain/email-mask";
import { emailSchema } from "@/features/auth/schema/auth-schemas";

export const metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const parsedEmail = emailSchema.safeParse(params.email);
  const email = parsedEmail.success ? parsedEmail.data : null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <MarketingHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <CheckEmailCard email={email} maskedEmail={maskEmail(email)} />
      </main>
    </div>
  );
}
