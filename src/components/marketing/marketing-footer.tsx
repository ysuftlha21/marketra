import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const footerGroups = [
  {
    label: "Platform",
    links: [
      { label: "Product", href: "/#product" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/pricing" },
      { label: "Sign in", href: "/sign-in" },
    ],
  },
  {
    label: "Trust",
    links: [
      { label: "AI & demo data", href: "/ai-disclosure" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Data deletion", href: "/data-deletion" },
    ],
  },
  {
    label: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Refund Policy", href: "/refund" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_2fr] lg:gap-20">
          <div>
            <BrandLogo link variant="full" size="md" theme="auto" />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              AI-powered market intelligence for confident international expansion.
            </p>
            <Link
              href="mailto:hello@getmarketra.com"
              className="mt-5 inline-flex rounded-sm text-sm font-medium text-foreground underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            >
              hello@getmarketra.com
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <nav key={group.label} aria-label={`${group.label} links`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  {group.label}
                </p>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rounded-sm text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Marketra. All rights reserved.</span>
          <span>Built for responsible, research-led market expansion.</span>
        </div>
      </div>
    </footer>
  );
}
