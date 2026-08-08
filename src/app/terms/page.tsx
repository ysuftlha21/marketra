import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/legal-page";

const description = "Terms governing access to and use of the Marketra platform and services.";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | Marketra" },
  description,
  alternates: { canonical: "https://getmarketra.com/terms" },
  openGraph: {
    title: "Terms of Service | Marketra",
    description,
    url: "https://getmarketra.com/terms",
    siteName: "Marketra",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These Terms of Service govern your access to and use of Marketra at getmarketra.com. By
        creating an account or using the service, you agree to these terms.
      </p>
      <section>
        <h2 className="font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>
          You must be legally able to enter into these terms and, when acting for an organization,
          authorized to bind that organization. If you do not agree, do not use Marketra.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">2. Service Description</h2>
        <p>
          Marketra provides market-entry research, customer-discovery workflows, company matching,
          and AI-assisted drafts. Outputs are decision-support materials, require human review, and
          do not guarantee accuracy, availability, compliance, or commercial results.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">3. Accounts</h2>
        <p>
          You are responsible for accurate account information, safeguarding credentials, activity
          under your account, and promptly notifying us of suspected unauthorized access. You may
          not share access in a way that bypasses plan or workspace limits.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">4. Subscriptions</h2>
        <p>
          Paid plan features, billing intervals, and included usage are shown before purchase.
          Subscriptions renew for the selected interval until canceled. Cancellation stops future
          renewals but does not ordinarily shorten the billing period already paid.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">5. Billing</h2>
        <p>
          Prices and applicable taxes are shown before purchase. Payment processing may be provided
          by an authorized third-party payment provider. Current cancellation and refund terms are
          described in the Refund Policy.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">6. User Responsibilities</h2>
        <p>
          You must have authority to submit and process data, keep workspace permissions current,
          review generated content before use, and comply with privacy, marketing, export, and
          communications laws applicable to your activities.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">7. Acceptable Use</h2>
        <p>
          You may not use Marketra for unlawful scraping, spam, impersonation, harassment, malware,
          security testing without permission, automated social-network actions, infringement, or
          attempts to bypass security, quotas, access controls, or provider restrictions.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">8. Intellectual Property</h2>
        <p>
          Marketra and its software, branding, and service materials are protected by intellectual
          property laws. You retain rights in content you submit and grant us the limited rights
          needed to host, process, and transmit it solely to provide and secure the service.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">9. Availability</h2>
        <p>
          We work to keep Marketra available, but do not promise uninterrupted or error-free
          operation. Features may depend on third-party providers and may change, be suspended, or
          become unavailable for maintenance, security, legal, or operational reasons.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Marketra is not liable for indirect, incidental,
          special, consequential, or lost-profit damages arising from use of the service. Nothing in
          these terms excludes liability that cannot legally be limited.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">11. Termination</h2>
        <p>
          You may stop using Marketra and cancel a subscription at any time. We may restrict or
          terminate access for material breach, abuse, non-payment, security risk, or legal
          necessity. Provisions intended by their nature to survive termination remain effective.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">12. Contact Information</h2>
        <p>
          Questions about these terms can be sent to
          <a className="ml-1 text-primary hover:underline" href="mailto:hello@getmarketra.com">
            hello@getmarketra.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
