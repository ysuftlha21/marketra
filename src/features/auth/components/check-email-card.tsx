"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { resendSignupConfirmationAction } from "@/features/auth/api/auth-actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ResendState = "idle" | "loading" | "success" | "rate_limit" | "error";

function isRateLimitMessage(message: string): boolean {
  return /too many|rate|wait \d+ seconds/i.test(message);
}

export function CheckEmailCard({
  email,
  maskedEmail,
  initialCooldownSeconds = 60,
}: {
  email: string | null;
  maskedEmail: string;
  initialCooldownSeconds?: number;
}) {
  const [cooldown, setCooldown] = React.useState(initialCooldownSeconds);
  const [state, setState] = React.useState<ResendState>("idle");
  const [message, setMessage] = React.useState(
    "We sent a confirmation link. Open it to finish creating your account.",
  );
  const pendingRef = React.useRef(false);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0 || pendingRef.current) return;
    pendingRef.current = true;
    setCooldown(60);
    setState("loading");
    setMessage("Requesting another confirmation email…");
    const formData = new FormData();
    formData.set("email", email);
    try {
      const result = await resendSignupConfirmationAction(formData);
      if (result.error) {
        setState(isRateLimitMessage(result.error) ? "rate_limit" : "error");
        setMessage(result.error);
        return;
      }
      setState("success");
      setMessage(
        result.message ??
          "If this address can receive a confirmation email, a new message has been sent.",
      );
    } catch {
      setState("error");
      setMessage("We could not request another confirmation email. Please try again.");
    } finally {
      pendingRef.current = false;
    }
  }

  return (
    <section className="w-full max-w-lg rounded-2xl border border-border/60 bg-surface p-7 shadow-xl sm:p-10">
      <BrandLogo link variant="full" size="md" theme="auto" className="inline-flex" />
      <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
        <MailCheck className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-foreground">
        Check your email
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        We sent a confirmation link to{" "}
        <strong className="font-semibold text-foreground">{maskedEmail}</strong>. Confirm your email
        to continue to Marketra.
      </p>

      <div className="mt-6 rounded-xl border border-border/60 bg-muted/35 p-4">
        <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          The link may take a minute to arrive. Check your spam or promotions folder if you do not
          see it.
        </p>
      </div>

      <div
        className={cn(
          "mt-5 min-h-11 rounded-lg px-3 py-2.5 text-sm",
          state === "error" || state === "rate_limit"
            ? "border border-danger/20 bg-danger/5 text-danger"
            : "border border-primary/15 bg-primary/5 text-muted-foreground",
        )}
        role={state === "error" || state === "rate_limit" ? "alert" : "status"}
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </div>

      <button
        type="button"
        onClick={resend}
        disabled={!email || cooldown > 0 || state === "loading"}
        aria-busy={state === "loading"}
        className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
      >
        {state === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        {state === "loading"
          ? "Sending…"
          : cooldown > 0
            ? `Resend available in ${cooldown}s`
            : "Resend confirmation email"}
      </button>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row">
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Change email
        </Link>
        <span className="hidden text-border sm:inline" aria-hidden="true">
          •
        </span>
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </section>
  );
}
