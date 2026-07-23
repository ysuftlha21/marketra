import { LegalPage } from "@/features/legal/components/legal-page";
export const metadata = { title: "Cookie and Tracking Disclosure" };
export default function CookiesPage() {
  return (
    <LegalPage title="Cookie and Tracking Disclosure">
      <p>
        Marketra uses essential authentication and session storage required to sign users in and
        protect workspace access. No optional advertising or cross-site tracking provider is
        represented as active. This disclosure must be updated before enabling optional analytics or
        marketing cookies.
      </p>
    </LegalPage>
  );
}
