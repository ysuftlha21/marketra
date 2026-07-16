"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schema/auth-schemas";
import { forgotPasswordAction } from "@/features/auth/api/auth-actions";
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
import { Mail, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function ForgotPasswordForm() {
  const [done, setDone] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("email", values.email);
      await forgotPasswordAction(formData);
      setDone(true);
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
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we will send a reset link if the account exists.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div
            className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-foreground"
            role="status"
          >
            <p className="font-medium">Check your inbox.</p>
            <p className="mt-1 text-muted-foreground">
              If an account exists for that email, a reset link is on its way.
            </p>
          </div>
        ) : (
          <form
            className="space-y-5"
            aria-label="Forgot password form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
            >
              <Mail className="h-4 w-4" /> {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
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
