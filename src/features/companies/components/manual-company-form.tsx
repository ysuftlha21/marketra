"use client";

import { useActionState } from "react";
import { createManualCompanyAction } from "../api/company-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ManualCompanyForm(props: {
  projectSlug: string;
  targetCountryId: string;
  countryCode: string;
}) {
  const [state, action, pending] = useActionState(createManualCompanyAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" aria-busy={pending}>
      <input type="hidden" name="projectSlug" value={props.projectSlug} />
      <input type="hidden" name="targetCountryId" value={props.targetCountryId} />
      <input type="hidden" name="countryCode" value={props.countryCode} />
      <Field label="Company name" name="companyName" required />
      <Field label="Website" name="websiteUrl" type="url" placeholder="https://example.com" />
      <Field label="City / location" name="city" />
      <Field label="Industry" name="industry" required />
      <Field label="Minimum employees" name="employeeMin" type="number" min="0" />
      <Field label="Maximum employees" name="employeeMax" type="number" min="0" />
      <Field label="Technology signals" name="technologySignals" placeholder="HubSpot, AWS" />
      <Field
        label="Purchase signals"
        name="purchaseSignals"
        placeholder="Hiring sales, expansion"
      />
      <Field label="Source URL" name="sourceUrl" type="url" className="sm:col-span-2" />
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="manual-description">Description</Label>
        <Textarea id="manual-description" name="description" maxLength={3000} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="manual-notes">Notes</Label>
        <Textarea id="manual-notes" name="notes" maxLength={5000} />
      </div>
      {state?.error && <p className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success sm:col-span-2">Company added.</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add company"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  className,
  ...input
}: {
  label: string;
  name: string;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "name">) {
  const id = `manual-${name}`;
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...input} />
    </div>
  );
}
