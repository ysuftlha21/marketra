"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/features/projects/schema/project-schemas";
import { createProjectAction, updateProjectAction } from "@/features/projects/api/project-actions";
import { slugifyProjectName } from "@/features/projects/domain/slug";
import type { ProjectRow } from "@/features/projects/repository/project-repository";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface ProjectFormProps {
  project?: ProjectRow;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const isEditing = !!project;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema) as never,
    mode: "onBlur",
    defaultValues: project
      ? {
          name: project.name,
          productDescription: project.product_description,
          websiteUrl: project.website_url ?? undefined,
          targetCustomerSummary: project.target_customer_summary ?? undefined,
          businessModel: project.business_model ?? undefined,
          pricingSummary: project.pricing_summary ?? undefined,
          currentMarkets: project.current_markets ?? [],
          preferredLanguage: project.preferred_language,
        }
      : {
          currentMarkets: [],
          preferredLanguage: "en",
        },
  });

  const values = watch();
  const name = values.name;
  React.useEffect(() => {
    if (!isEditing && name) {
      setValue("slug", slugifyProjectName(name) as never);
    }
  }, [name, setValue, isEditing]);

  const getMarketsError = () => {
    if (!errors.currentMarkets) return null;
    if (errors.currentMarkets.message) return errors.currentMarkets.message as string;
    if (Array.isArray(errors.currentMarkets)) {
      const first = errors.currentMarkets.find((e: { message?: string }) => e?.message);
      if (first) return first.message as string;
    }
    return null;
  };

  async function onSubmit(values: Record<string, unknown>) {
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("name", String(values.name ?? ""));
      formData.set("slug", slugifyProjectName(String(values.name ?? "")));
      formData.set("productDescription", String(values.productDescription ?? ""));
      if (values.websiteUrl) formData.set("websiteUrl", String(values.websiteUrl));
      if (values.targetCustomerSummary)
        formData.set("targetCustomerSummary", String(values.targetCustomerSummary));
      if (values.businessModel) formData.set("businessModel", String(values.businessModel));
      if (values.pricingSummary) formData.set("pricingSummary", String(values.pricingSummary));
      formData.set("currentMarkets", JSON.stringify(values.currentMarkets ?? []));
      formData.set("preferredLanguage", String(values.preferredLanguage ?? "en"));

      if (isEditing && project) {
        formData.set("slug", project.slug);
        const res = await updateProjectAction(formData);
        if (res?.error) {
          setError(res.error);
          setPending(false);
        } else {
          router.push(`/dashboard/projects/${project.slug}`);
        }
      } else {
        const result = await createProjectAction(formData);
        if (result && typeof result === "object" && "error" in result) {
          console.log("createProjectAction error:", result.error);
          setError(result.error as string);
          setPending(false);
        } else if (result && typeof result === "object" && "slug" in result) {
          router.push(`/dashboard/projects/${(result as { slug: string }).slug}`);
        } else {
          router.push("/dashboard/projects");
        }
      }
    } catch {
      if (!pending) setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit project" : "Create a new project"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your product information."
            : "Enter your SaaS product details to begin market analysis."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          aria-label={isEditing ? "Edit project form" : "Create project form"}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="name">Project name *</Label>
            <Input
              id="name"
              placeholder="e.g. SupportFlow"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-danger" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://example.com"
              aria-invalid={!!errors.websiteUrl}
              {...register("websiteUrl")}
            />
            {errors.websiteUrl && (
              <p className="text-xs text-danger" role="alert">
                {errors.websiteUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productDescription">Product description *</Label>
            <Textarea
              id="productDescription"
              rows={4}
              placeholder="Describe what your product does, who it is for, and what problem it solves..."
              aria-invalid={!!errors.productDescription}
              {...register("productDescription")}
            />
            <div className="flex justify-between mt-1">
              {errors.productDescription ? (
                <p className="text-xs text-danger" role="alert">
                  {errors.productDescription.message}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {(values.productDescription || "").length} / 5000
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetCustomerSummary">Target customer summary</Label>
            <Textarea
              id="targetCustomerSummary"
              rows={2}
              placeholder="Describe your ideal customer..."
              aria-invalid={!!errors.targetCustomerSummary}
              {...register("targetCustomerSummary")}
            />
            <div className="flex justify-between mt-1">
              {errors.targetCustomerSummary ? (
                <p className="text-xs text-danger" role="alert">
                  {errors.targetCustomerSummary.message}
                </p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {(values.targetCustomerSummary || "").length} / 2000
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessModel">Business model</Label>
              <Input
                id="businessModel"
                placeholder="e.g. SaaS subscription, usage-based"
                aria-invalid={!!errors.businessModel}
                {...register("businessModel")}
              />
              <div className="flex justify-between mt-1">
                {errors.businessModel ? (
                  <p className="text-xs text-danger" role="alert">
                    {errors.businessModel.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">
                  {(values.businessModel || "").length} / 1000
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricingSummary">Pricing summary</Label>
              <Input
                id="pricingSummary"
                placeholder="e.g. $49/mo for starter plan"
                aria-invalid={!!errors.pricingSummary}
                {...register("pricingSummary")}
              />
              <div className="flex justify-between mt-1">
                {errors.pricingSummary ? (
                  <p className="text-xs text-danger" role="alert">
                    {errors.pricingSummary.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">
                  {(values.pricingSummary || "").length} / 1000
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentMarkets">Current markets (comma-separated)</Label>
            <Input
              id="currentMarkets"
              placeholder="e.g. US, UK, DE"
              defaultValue={(project?.current_markets ?? []).join(", ")}
              aria-invalid={!!getMarketsError()}
              onChange={(e) =>
                setValue(
                  "currentMarkets",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean) as never,
                  { shouldValidate: true },
                )
              }
              onBlur={() => {
                // Ensure field gets validated on blur to match other fields
                const m = watch("currentMarkets");
                setValue("currentMarkets", m, { shouldValidate: true });
              }}
            />
            {getMarketsError() && (
              <p className="text-xs text-danger mt-1" role="alert">
                {getMarketsError()}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Saving…" : "Creating…"}
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create project"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/projects")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
