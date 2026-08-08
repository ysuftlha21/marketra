"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { countries } from "@/config/countries";

async function addCountryAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const projectSlug = formData.get("projectSlug") as string;
  const countryCode = formData.get("countryCode") as string;
  if (!projectSlug || !countryCode) return { error: "Select a country." };
  try {
    const m = await import("@/features/markets/api/market-actions");
    await m.addTargetCountryAction(formData);
    return null;
  } catch {
    return { error: "Failed to add country." };
  }
}

export function AddTargetCountryForm({ projectSlug }: { projectSlug: string }) {
  const [state, formAction, pending] = useActionState(addCountryAction, null);

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end"
    >
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <label htmlFor="target-country" className="sr-only">
        Target country
      </label>
      <select
        id="target-country"
        name="countryCode"
        required
        disabled={pending}
        className="h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:min-w-64"
      >
        <option value="">Select a country…</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add"}
      </Button>
      {state?.error && (
        <p role="alert" className="w-full text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
