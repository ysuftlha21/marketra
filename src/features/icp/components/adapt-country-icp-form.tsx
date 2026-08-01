"use client";

import { useActionState } from "react";
import { adaptCountryIcpAction } from "../api/icp-actions";
import { Button } from "@/components/ui/button";

export function AdaptCountryIcpForm(props: {
  projectSlug: string;
  countryId: string;
  countryCode: string;
  countryName: string;
}) {
  const [state, action, pending] = useActionState(adaptCountryIcpAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="projectSlug" value={props.projectSlug} />
      <input type="hidden" name="countryId" value={props.countryId} />
      <input type="hidden" name="countryCode" value={props.countryCode} />
      <Button type="submit" disabled={pending}>
        {pending ? "Adapting ICP…" : `Adapt ICP for ${props.countryName}`}
      </Button>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {state?.error ?? (state?.ok ? "Country ICP created. Discovery is ready." : null)}
      </p>
    </form>
  );
}
