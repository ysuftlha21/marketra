"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { workspaceNameSchema } from "@/features/workspaces/domain/slug";
import { renameWorkspaceAction } from "@/features/workspaces/api/workspace-actions";
import { Input, Label } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const renameSchema = z.object({ name: workspaceNameSchema });

export function RenameWorkspaceForm({ initialName }: { initialName: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ name: string }>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: initialName },
  });

  async function onSubmit(values: { name: string }) {
    setError(null);
    setOk(false);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("name", values.name);
      const res = await renameWorkspaceAction(formData);
      if (res?.error) setError(res.error);
      else setOk(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-3"
      aria-label="Rename workspace form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {ok && (
        <p role="status" className="text-sm text-success">
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ variant: "default", size: "sm" }))}
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
