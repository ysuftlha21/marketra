import type { ReactNode } from "react";
import Link from "next/link";
import { getLegalConfig } from "../legal-config";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const config = getLegalConfig();
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to Marketra
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: {config.effectiveDate}</p>
      <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-sm leading-7 text-muted-foreground dark:prose-invert">
        {children}
      </div>
      <p className="mt-10 border-t pt-6 text-xs text-muted-foreground">
        Operator: {config.operatorName}. Address: {config.operatorAddress}. Contact:{" "}
        {config.supportEmail}. These terms require review by a qualified legal professional before
        public launch.
      </p>
    </main>
  );
}
