import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you were looking for doesn&rsquo;t exist or has moved.
      </p>
      <div className="flex gap-2">
        <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
          Back to home
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
