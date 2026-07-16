"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { icpEditSchema, type IcpEditInput } from "@/features/icp/schema/icp-schemas";

async function submitAction(
  _prev: { error: string | null } | null,
  formData: FormData,
): Promise<{ error: string | null }> {
  const m = await import("@/features/icp/api/icp-actions");
  try {
    await m.updateIcpAction(formData);
    return { error: null };
  } catch {
    return { error: "Failed to save changes." };
  }
}

export function IcpEditForm({
  projectSlug,
  icpId,
  defaultName,
  defaultSummary,
}: {
  projectSlug: string;
  icpId: string;
  defaultName: string;
  defaultSummary: string;
}) {
  const [state, formAction, pending] = useActionState(submitAction, null);
  const {
    register,
    formState: { errors },
  } = useForm<IcpEditInput>({
    resolver: zodResolver(icpEditSchema.pick({ name: true, summary: true })),
    defaultValues: { name: defaultName, summary: defaultSummary },
  });

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="icpId" value={icpId} />
      <div>
        <input
          {...register("name")}
          className="flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-danger"
          placeholder="Profile name"
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
      </div>
      <div>
        <textarea
          {...register("summary")}
          rows={2}
          className="flex w-full rounded-md border border-input bg-surface px-3 py-2 text-sm aria-[invalid=true]:border-danger"
          placeholder="Summary"
          aria-invalid={!!errors.summary}
        />
        {errors.summary && <p className="mt-1 text-xs text-danger">{errors.summary.message}</p>}
      </div>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save edits"}
      </Button>
    </form>
  );
}
