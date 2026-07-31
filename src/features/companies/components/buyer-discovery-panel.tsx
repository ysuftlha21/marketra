"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BuyerContactRow } from "../repository/buyer-workflow-repository";
import {
  discoverBuyersAction,
  handoffBuyerToOutreachAction,
  revealBuyerEmailAction,
} from "../api/buyer-workflow-actions";

export function BuyerDiscoveryPanel({
  projectId,
  companyId,
  contacts,
  providerLabel,
}: {
  projectId: string;
  companyId: string;
  contacts: BuyerContactRow[];
  providerLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<string>();
  const [confirmContact, setConfirmContact] = React.useState<BuyerContactRow | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string; errorReference?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? "Saved successfully."
          : `${result.error} Error reference: ${result.errorReference}`,
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Buyer discovery</CardTitle>
            <CardDescription>
              Coverage may be incomplete. Emails are never revealed automatically.
            </CardDescription>
          </div>
          <Badge variant="outline">{providerLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={(formData) =>
            run(() =>
              discoverBuyersAction({
                projectId,
                companyId,
                department: String(formData.get("department") ?? "") || undefined,
                seniority: String(formData.get("seniority") ?? "") || undefined,
                page: 1,
                pageSize: 10,
              }),
            )
          }
          className="flex flex-wrap gap-2"
        >
          <select
            name="department"
            aria-label="Buyer department"
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          >
            <option value="">All departments</option>
            <option value="executive">Executive</option>
            <option value="sales">Sales</option>
            <option value="marketing">Marketing</option>
            <option value="it">IT</option>
          </select>
          <select
            name="seniority"
            aria-label="Buyer seniority"
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          >
            <option value="">All seniorities</option>
            <option value="executive">Executive</option>
            <option value="senior">Senior</option>
            <option value="junior">Junior</option>
          </select>
          <Button type="submit" disabled={pending}>
            {pending ? "Searching…" : "Find buyers"}
          </Button>
        </form>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved buyers yet. Run buyer discovery for this company.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {contact.full_name ?? "Professional contact"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[contact.job_title, contact.department, contact.seniority]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {contact.professional_profile_url && (
                    <a
                      href={contact.professional_profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Public professional profile
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Email: {contact.email_address ?? contact.email_status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!contact.email_address && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmContact(contact)}
                    >
                      Reveal email
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        handoffBuyerToOutreachAction({
                          projectId,
                          companyId,
                          contactId: contact.id,
                        }),
                      )
                    }
                  >
                    Add to outreach
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {confirmContact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reveal-email-title"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <h2 id="reveal-email-title" className="font-semibold">
              Reveal this email?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This explicit action may consume email finder and verification credits. Marketra will
              reuse a recent cached verification when available.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmContact(null)}>
                Cancel
              </Button>
              <Button
                disabled={pending}
                onClick={() => {
                  const id = confirmContact.id;
                  setConfirmContact(null);
                  run(() =>
                    revealBuyerEmailAction({
                      projectId,
                      companyId,
                      contactId: id,
                      confirmed: "true",
                    }),
                  );
                }}
              >
                Confirm and reveal
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
