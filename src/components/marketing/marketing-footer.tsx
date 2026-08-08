import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                M
              </span>
              <span>Marketra</span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground">
              Find the right market. Reach the right companies.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-2 text-sm text-muted-foreground">
            <Link href="/#product" className="hover:text-foreground">
              Product
            </Link>
            <Link href="/#how-it-works" className="hover:text-foreground">
              How it works
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/refund" className="hover:text-foreground">
              Refund Policy
            </Link>
            <Link href="/cookies" className="hover:text-foreground">
              Cookies
            </Link>
            <Link href="/ai-disclosure" className="hover:text-foreground">
              AI &amp; demo data
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground">
              Data deletion
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Marketra. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
