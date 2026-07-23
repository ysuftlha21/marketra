import { LegalPage } from "@/features/legal/components/legal-page";

export const metadata = { title: "Privacy Policy" };
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2 className="font-semibold text-foreground">Data we process</h2>
        <p>
          Marketra processes account, workspace, product, company, market, and outreach-draft
          information supplied by authorized users. Operational metadata is minimized and does not
          intentionally store provider credentials or full AI prompts in usage logs.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Purpose and retention</h2>
        <p>
          Data is used to provide and secure the service. Retention periods remain subject to
          operator policy and legal review; Marketra does not claim automatic regulatory compliance.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Requests</h2>
        <p>
          Access, correction, export, or deletion requests use the contact instructions on the Data
          Deletion page and require identity and workspace-authorization verification.
        </p>
      </section>
    </LegalPage>
  );
}
