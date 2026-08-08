import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/legal-page";

const description = "How Marketra collects, uses, protects, and retains personal information.";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | Marketra" },
  description,
  alternates: { canonical: "https://getmarketra.com/privacy" },
  openGraph: {
    title: "Privacy Policy | Marketra",
    description,
    url: "https://getmarketra.com/privacy",
    siteName: "Marketra",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This Privacy Policy explains how Marketra handles personal information when you visit
        getmarketra.com, create an account, or use the Marketra platform.
      </p>
      <section>
        <h2 className="font-semibold text-foreground">1. Information We Collect</h2>
        <p>
          We collect information you submit, limited technical and usage information needed to
          operate and secure the service, and data created through authorized workspace workflows.
          This may include contact details, product and market inputs, company records, and support
          communications.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">2. Account Data</h2>
        <p>
          Account data may include your name, email address, authentication status, workspace role,
          subscription status, and activity required for account administration. Passwords and
          authentication credentials are handled through our authentication provider.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">3. Cookies</h2>
        <p>
          Marketra uses essential cookies for authentication, security, preferences, and session
          continuity. Where non-essential cookies are introduced, they will be described and
          controlled in accordance with applicable consent requirements.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">4. Analytics</h2>
        <p>
          We may process limited product-usage events to understand reliability and improve the
          service. We minimize event data and do not intentionally place passwords, provider
          credentials, full prompts, or payment credentials in analytics events.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">5. Security</h2>
        <p>
          We use administrative, technical, and organizational safeguards designed to protect
          information, including access controls and workspace isolation. No online system can be
          guaranteed completely secure.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">6. Third-Party Services</h2>
        <p>
          Marketra uses service providers for functions such as hosting, authentication, payment
          processing, analytics, and enabled data or AI features. They process information only as
          necessary to provide those functions and subject to their applicable terms and privacy
          obligations.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">7. GDPR and EEA Rights</h2>
        <p>
          Where the GDPR or similar laws apply, you may have rights to access, correct, delete,
          restrict, object to processing, or receive a portable copy of personal data, and to
          complain to a supervisory authority. We may verify identity and workspace authority before
          fulfilling a request.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">8. Data Retention</h2>
        <p>
          We retain information for as long as needed to provide the service, maintain security and
          records, resolve disputes, and meet legal obligations. Retention depends on data type,
          account status, workspace instructions, and applicable requirements.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">9. Contact</h2>
        <p>
          Privacy questions and verified rights requests can be sent to
          <a className="ml-1 text-primary hover:underline" href="mailto:hello@getmarketra.com">
            hello@getmarketra.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
