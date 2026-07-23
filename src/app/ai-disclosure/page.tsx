import { LegalPage } from "@/features/legal/components/legal-page";
export const metadata = { title: "AI and Demo Data Disclosure" };
export default function AiDisclosurePage() {
  return (
    <LegalPage title="AI and Demo Data Disclosure">
      <p>
        AI-assisted analysis, Decision Role recommendations, and Outreach drafts may contain
        estimates or errors and require human review. Marketra labels Mock discovery results as demo
        data and manually entered companies by provenance. Demo data is not verified external
        company intelligence.
      </p>
    </LegalPage>
  );
}
