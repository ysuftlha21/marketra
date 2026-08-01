"use client";

import { useActionState } from "react";
import { startDiscoveryFormAction } from "../api/company-actions";
import { DiscoverySubmitButton } from "./discovery-submit-button";

export function DiscoveryFiltersForm(props: {
  projectSlug: string;
  countryId: string;
  countryName: string;
  countryCode: string;
  industry?: string;
  employeeMin?: string;
  employeeMax?: string;
  keywords?: string;
  technologies?: string;
  disabled?: boolean;
  providerMessage: string;
}) {
  const [state, action] = useActionState(startDiscoveryFormAction, null);
  return (
    <form
      aria-label="Company discovery filters"
      action={action}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" name="projectSlug" value={props.projectSlug} />
      <input type="hidden" name="countryId" value={props.countryId} />
      <label className="space-y-1 text-xs text-muted-foreground">
        Country / market
        <input
          value={`${props.countryName} (${props.countryCode})`}
          readOnly
          className="block h-10 w-full rounded-md border border-border bg-muted/30 px-3 text-sm text-foreground"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Industry
        <input
          name="industry"
          maxLength={100}
          defaultValue={props.industry}
          className="block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Minimum employees
        <input
          name="employeeMin"
          type="number"
          min="0"
          defaultValue={props.employeeMin}
          className="block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Maximum employees
        <input
          name="employeeMax"
          type="number"
          min="0"
          defaultValue={props.employeeMax}
          className="block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        Result limit
        <select
          name="maxResults"
          defaultValue="25"
          className="block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
        >
          <option>10</option>
          <option>25</option>
          <option>50</option>
          <option>100</option>
        </select>
      </label>
      <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
        Keywords, comma separated
        <input
          name="keywords"
          maxLength={300}
          defaultValue={props.keywords}
          className="block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
        Technologies, comma separated
        <input
          name="technologies"
          maxLength={300}
          defaultValue={props.technologies}
          className="block h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-4">
        <DiscoverySubmitButton disabled={props.disabled} />
        <p className="text-xs text-muted-foreground">{props.providerMessage}</p>
      </div>
      <p aria-live="polite" className="sm:col-span-2 lg:col-span-4">
        {state?.error ? (
          <span className="text-sm text-destructive">
            {state.error}
            {state.errorReference ? ` Reference: ${state.errorReference}` : ""}
          </span>
        ) : state?.ok ? (
          <span className="text-sm text-success">Discovery completed.</span>
        ) : null}
      </p>
    </form>
  );
}
