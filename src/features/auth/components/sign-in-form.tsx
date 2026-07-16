"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/features/auth/schema/auth-schemas";
import { signInAction } from "@/features/auth/api/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Mail, Lock, ArrowRight, Globe, BarChart3, Target, Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function SignInForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInInput) {
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      const res = await signInAction(formData);
      if (res?.error) setError(res.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full items-center justify-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-xl lg:grid-cols-5">
        <div className="hidden flex-col justify-between bg-primary p-10 lg:col-span-2 lg:flex text-primary-foreground">
          <BrandLogo link variant="full" size="lg" theme="dark" className="inline-flex" />
          <div className="my-12 space-y-8">
            <h2 className="font-display text-2xl font-medium leading-tight tracking-tight">
              Welcome back to Marketra.
            </h2>
            <div className="space-y-5">
              {[
                { icon: Target, label: "Pick up where you left off" },
                { icon: Globe, label: "Review your market analyses" },
                { icon: BarChart3, label: "Compare countries and decide" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-primary-foreground/80">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-primary-foreground/60">
            No credit card · Free plan available · Cancel anytime
          </p>
        </div>

        <div className="p-8 sm:p-10 lg:col-span-3">
          <div className="mb-8 lg:hidden">
            <BrandLogo link variant="mark" size="sm" theme="auto" />
          </div>

          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back. Enter your credentials to continue.
          </p>

          <form
            className="mt-8 space-y-5"
            aria-label="Sign in form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  aria-invalid={!!errors.email}
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="pl-10 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
            >
              {pending ? "Signing in…" : "Sign in"} <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/sign-up" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
