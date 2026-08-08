import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/legal-page";

const description = "Marketra subscription cancellation, refund, and payment dispute policy.";

export const metadata: Metadata = {
  title: { absolute: "Refund Policy | Marketra" },
  description,
  alternates: { canonical: "https://getmarketra.com/refund" },
  openGraph: {
    title: "Refund Policy | Marketra",
    description,
    url: "https://getmarketra.com/refund",
    siteName: "Marketra",
    type: "website",
  },
};

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        This Refund Policy explains how subscription cancellations and payment concerns are handled
        for Marketra purchases made through getmarketra.com.
      </p>
      <section>
        <h2 className="font-semibold text-foreground">1. Cancellation</h2>
        <p>
          You may cancel a paid subscription through the available account or billing controls.
          Cancellation stops the next renewal; access ordinarily continues through the paid billing
          period unless the account is suspended for a security, legal, or policy reason.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">2. Refund Eligibility</h2>
        <p>
          Refund requests are reviewed individually. Eligibility may depend on the purchase date,
          service usage, the reason for the request, applicable consumer law, and payment-provider
          rules. Approval is not automatic, and submitting a request does not guarantee a refund.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">3. Duplicate Charges</h2>
        <p>
          If you believe the same purchase was charged more than once, contact us with the charge
          dates and non-sensitive transaction references. Confirmed duplicate charges will be
          investigated promptly. Confirmed duplicate charges are always refunded to the original
          payment method where possible.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">4. Fraudulent Payments</h2>
        <p>
          Report suspected unauthorized or fraudulent payments immediately. We may restrict the
          related account while investigating and may ask for information needed to verify account
          ownership. Fraudulent payments are refunded when appropriate based on the investigation,
          applicable law, and payment-provider rules. Never send full card numbers or payment
          credentials.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">5. Chargebacks</h2>
        <p>
          Please contact us first so we can investigate a billing concern. Initiating a chargeback
          may cause the associated account or subscription to be restricted while the payment
          provider reviews the dispute. This does not limit rights available under applicable law.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">6. How to Request a Refund</h2>
        <p>
          Email hello@getmarketra.com from the account email and include the workspace name,
          purchase date, a non-sensitive transaction reference, and the reason for your request. Do
          not include passwords, complete card numbers, or other payment credentials.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">7. Contact</h2>
        <p>
          Questions about this policy can be sent to
          <a className="ml-1 text-primary hover:underline" href="mailto:hello@getmarketra.com">
            hello@getmarketra.com
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
