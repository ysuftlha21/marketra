import { LegalPage } from "@/features/legal/components/legal-page";
export const metadata = { title: "Terms of Service" };
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <h2 className="font-semibold text-foreground">Service</h2>
        <p>
          Marketra provides market-entry research, workflow tools, and draft AI-assisted outputs.
          Outputs require human review and are not guarantees of accuracy, legal compliance,
          commercial results, or data availability.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Acceptable use</h2>
        <p>
          Users must have authority to submit data, respect applicable laws and platform
          restrictions, and must not use Marketra for unlawful scraping, spam, impersonation, or
          automated LinkedIn actions.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Availability</h2>
        <p>
          Closed-beta features and external providers may change or be unavailable. Paid billing is
          not represented as active unless a verified provider is configured.
        </p>
      </section>
    </LegalPage>
  );
}
