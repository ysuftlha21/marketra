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
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <select
        name="countryCode"
        required
        disabled={pending}
        className="flex h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
      >
        <option value="">Select a country…</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        <Plus className="h-4 w-4" /> {pending ? "Adding…" : "Add"}
      </Button>
      {state?.error && <p className="w-full text-xs text-danger">{state.error}</p>}
    </form>
  );
}
