"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createWorkspaceSchema,
  type CreateWorkspaceInput,
} from "@/features/auth/schema/auth-schemas";
import { createWorkspaceAction } from "@/features/workspaces/api/workspace-actions";
import { slugifyWorkspaceName, normalizeSlug } from "@/features/workspaces/domain/slug";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function CreateWorkspaceForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateWorkspaceInput>({ resolver: zodResolver(createWorkspaceSchema) });

  const name = watch("name");
  React.useEffect(() => {
    if (name) setValue("slug", slugifyWorkspaceName(name), { shouldValidate: true });
  }, [name, setValue]);

  async function onSubmit(values: CreateWorkspaceInput) {
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("name", values.name);
      formData.set("slug", normalizeSlug(values.slug));
      const res = await createWorkspaceAction(formData);
      if (res?.error) setError(res.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          A workspace holds your SaaS projects, target markets and outreach. You will become its
          owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          aria-label="Create workspace form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              placeholder="Acme Labs"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="acme-labs"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            {errors.slug && <p className="text-xs text-danger">{errors.slug.message}</p>}
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers and single hyphens.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ variant: "default" }), "w-full")}
          >
            {pending ? "Creating…" : "Create workspace"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
