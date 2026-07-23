"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/features/auth/schema/auth-schemas";
import { signUpAction } from "@/features/auth/api/auth-actions";
import { Input, Label } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Mail, Lock, User, ArrowRight, Globe, BarChart3, Target, Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export function SignUpForm({
  pricingIntent,
}: {
  pricingIntent?: { plan?: string; interval?: string; trial?: boolean };
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const pendingRef = React.useRef(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });
  const password = watch("password", "");

  async function onSubmit(values: SignUpInput) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setError(null);
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      formData.set("confirmPassword", values.confirmPassword);
      if (values.displayName) formData.set("displayName", values.displayName);
      if (pricingIntent?.plan) formData.set("plan", pricingIntent.plan);
      if (pricingIntent?.interval) formData.set("billingInterval", pricingIntent.interval);
      if (pricingIntent?.trial) formData.set("trial", "true");
      const res = await signUpAction(formData);
      if (res?.error) setError(res.error);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const strength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : /[A-Z]/.test(password) && /[0-9]/.test(password)
          ? 3
          : 2;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-xl lg:grid-cols-5">
        {/* Left panel — product context */}
        <div className="hidden flex-col justify-between bg-primary p-10 lg:col-span-2 lg:flex text-primary-foreground">
          <BrandLogo link variant="full" size="lg" theme="dark" className="inline-flex" />
          <div className="my-12 space-y-8">
            <h2 className="font-display text-2xl font-medium leading-tight tracking-tight">
              Find the right market.
              <br />
              Reach the right companies.
            </h2>
            <div className="space-y-5">
              {[
                { icon: Target, label: "Analyze your SaaS product" },
                { icon: Globe, label: "Compare target countries" },
                { icon: BarChart3, label: "Get structured entry recommendations" },
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

        {/* Right panel — form */}
        <div className="p-8 sm:p-10 lg:col-span-3">
          {pricingIntent?.plan && (
            <p className="mb-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Selected plan:{" "}
              <span className="font-semibold capitalize text-foreground">{pricingIntent.plan}</span>{" "}
              · {pricingIntent.interval === "annual" ? "Annual" : "Monthly"}
            </p>
          )}
          <div className="mb-8 lg:hidden">
            <BrandLogo link variant="mark" size="sm" theme="auto" />
          </div>

          <h1 className="font-display text-2xl font-medium tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start analyzing markets in under a minute.
          </p>

          <form
            className="mt-8 space-y-5"
            aria-label="Create account form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  className="pl-10"
                  {...register("displayName")}
                />
              </div>
            </div>

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
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
              {password && (
                <div className="flex gap-1 mt-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i < strength
                          ? strength === 3
                            ? "bg-success"
                            : strength === 2
                              ? "bg-accent"
                              : "bg-danger"
                          : "bg-border",
                      )}
                    />
                  ))}
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-danger" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  className="pl-10 pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-danger" role="alert">
                  {errors.confirmPassword.message}
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
              aria-busy={pending}
              className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full")}
            >
              {pending ? "Creating account…" : "Create account"}{" "}
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
            <p className="text-center text-xs leading-5 text-muted-foreground">
              By creating an account, you acknowledge the{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
