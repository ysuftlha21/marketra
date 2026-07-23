import { LegalPage } from "@/features/legal/components/legal-page";
export const metadata = { title: "Data Deletion" };
export default function DataDeletionPage() {
  return (
    <LegalPage title="Data Deletion and Account Requests">
      <p>
        Automated account deletion is not currently offered. Contact the published support address
        from your account email. The operator must verify identity, workspace ownership, retention
        obligations, and the requested scope before deletion. Destructive production changes require
        explicit confirmation and an auditable operator procedure.
      </p>
    </LegalPage>
  );
}
