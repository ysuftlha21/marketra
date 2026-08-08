import {
  ArrowRight,
  BarChart3,
  Clock3,
  Languages,
  MoreHorizontal,
  RotateCcw,
  Star,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCountry } from "@/config/countries";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils/cn";
import {
  rejectCountryAction,
  restoreCountryAction,
  shortlistCountryAction,
} from "../api/market-actions";
import { marketResearchLabel } from "../domain/market-workspace-view";
import type { TargetCountrySummary } from "../repository/market-repository";
import { RunMarketAnalysisForm } from "./run-market-analysis-form";

export function MarketWorkspaceCard({
  market,
  projectSlug,
}: {
  market: TargetCountrySummary;
  projectSlug: string;
}) {
  const country = getCountry(market.country_code);
  const href = `/dashboard/projects/${projectSlug}/markets/${market.country_code}`;
  const recommendation = market.latest_recommendation ?? "Pending research";
  const confidence = market.latest_confidence ?? "Not assessed";

  return (
    <Card className="group relative flex min-w-0 flex-col overflow-visible transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3 border-b border-border/70 p-5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-xl"
          aria-hidden="true"
        >
          {country?.flagEmoji ?? market.country_code}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                  <Link
                    href={href}
                    className="rounded-sm transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {country?.name ?? market.country_name}
                  </Link>
                </h2>
                <StatusBadge status={market.status} />
              </div>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {(country?.region ?? market.region_code ?? "Region unavailable").replaceAll(
                  "-",
                  " ",
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <FavoriteControl market={market} projectSlug={projectSlug} />
              <MarketOverflow market={market} projectSlug={projectSlug} href={href} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <dl className="grid grid-cols-2 gap-2">
          <MarketMetric label="Opportunity" value={recommendation} capitalize />
          <MarketMetric label="Confidence" value={confidence} capitalize />
          <MarketMetric label="Language" value={country?.primaryLanguage ?? "Unavailable"} />
          <MarketMetric label="Currency" value={country?.currency ?? "Unavailable"} />
        </dl>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5 text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{marketResearchLabel(market)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5 text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {market.last_analyzed_at
                ? `Updated ${formatDate(market.last_analyzed_at)}`
                : "Awaiting first analysis"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5" aria-hidden="true" />
            {market.latest_analysis_output
              ? "Localization and demand evidence available"
              : "Competition and localization pending research"}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!market.latest_analysis_status && (
              <RunMarketAnalysisForm projectSlug={projectSlug} countryId={market.id} />
            )}
            {(market.latest_analysis_status === "pending" ||
              market.latest_analysis_status === "running") && (
              <RunMarketAnalysisForm projectSlug={projectSlug} countryId={market.id} disabled />
            )}
            {market.latest_analysis_status === "failed" && (
              <RunMarketAnalysisForm projectSlug={projectSlug} countryId={market.id} mode="retry" />
            )}
            {market.latest_analysis_status === "succeeded" && (
              <Link href={href} className={cn(buttonVariants({ size: "sm" }))}>
                Open intelligence <ArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function FavoriteControl({
  market,
  projectSlug,
}: {
  market: TargetCountrySummary;
  projectSlug: string;
}) {
  if (market.status === "analyzed") {
    return (
      <form action={shortlistCountryAction}>
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="countryId" value={market.id} />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={`Add ${market.country_name} to favorites`}
          title="Add to favorites"
        >
          <Star aria-hidden="true" />
        </Button>
      </form>
    );
  }
  if (market.status === "shortlisted") {
    return (
      <form action={restoreCountryAction}>
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="countryId" value={market.id} />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${market.country_name} from favorites`}
          title="Remove from favorites"
        >
          <Star className="fill-warning text-warning" aria-hidden="true" />
        </Button>
      </form>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled
      aria-label={`Favorite ${market.country_name} after research`}
      title="Complete research before favoriting"
    >
      <Star aria-hidden="true" />
    </Button>
  );
}

function MarketMetric({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/70 px-3 py-2.5">
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm font-semibold text-foreground",
          capitalize && "capitalize",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function MarketOverflow({
  market,
  projectSlug,
  href,
}: {
  market: TargetCountrySummary;
  projectSlug: string;
  href: string;
}) {
  return (
    <details className="relative z-20 shrink-0">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
        aria-label={`Actions for ${market.country_name}`}
      >
        <MoreHorizontal aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-11 z-30 w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
        <Link
          href={href}
          className="block rounded-md px-2.5 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open market intelligence
        </Link>
        <Link
          href={`/dashboard/projects/${projectSlug}/markets/compare`}
          className="block rounded-md px-2.5 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Compare markets
        </Link>
        <div className="my-1 border-t border-border" />
        {market.status === "analyzed" && (
          <MarketAction
            action={shortlistCountryAction}
            projectSlug={projectSlug}
            marketId={market.id}
          >
            <Star aria-hidden="true" /> Add to favorites
          </MarketAction>
        )}
        {(market.status === "shortlisted" || market.status === "rejected") && (
          <MarketAction
            action={restoreCountryAction}
            projectSlug={projectSlug}
            marketId={market.id}
          >
            <RotateCcw aria-hidden="true" /> Restore to selected
          </MarketAction>
        )}
        {(market.status === "analyzed" || market.status === "shortlisted") && (
          <MarketAction
            action={rejectCountryAction}
            projectSlug={projectSlug}
            marketId={market.id}
            danger
          >
            <XCircle aria-hidden="true" /> Deprioritize
          </MarketAction>
        )}
      </div>
    </details>
  );
}

function MarketAction({
  action,
  projectSlug,
  marketId,
  children,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>;
  projectSlug: string;
  marketId: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="countryId" value={marketId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start",
          danger && "text-danger hover:bg-danger/10 hover:text-danger",
        )}
      >
        {children}
      </Button>
    </form>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
