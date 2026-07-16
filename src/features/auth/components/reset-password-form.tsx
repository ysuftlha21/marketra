"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schema/auth-schemas";
import { resetPasswordAction } from "@/features/auth/api/auth-actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function ResetPasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("password", values.password);
      formData.set("confirmPassword", values.confirmPassword);
      const res = await resetPasswordAction(formData);
      if (res?.error) setError(res.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="mx-auto mb-4">
          <BrandLogo variant="mark" size="sm" theme="auto" />
        </div>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>Choose a new password for your Marketra account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          aria-label="Reset password form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-danger" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-danger" role="alert">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
          >
            <LockKeyhole className="h-4 w-4" /> {pending ? "Saving…" : "Update password"}
          </button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border pt-4 text-sm text-muted-foreground">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
