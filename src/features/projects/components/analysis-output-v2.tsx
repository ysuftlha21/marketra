import type { V2ProductAnalysisResult } from "@/lib/providers/ai/ai.provider";

export function AnalysisOutputV2({
  output,
  meta,
}: {
  output: V2ProductAnalysisResult;
  meta: { provider: string; promptVersion: string | null; confidence: string };
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
          Positioning
        </h3>
        <p className="text-base italic leading-relaxed text-foreground">{output.positioning}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Value Proposition
          </h3>
          <p className="text-sm leading-relaxed text-foreground">{output.valueProposition}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Business Model & Pricing
          </h3>
          <p className="mb-2 text-sm leading-relaxed text-foreground">{output.businessModel}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {output.pricingInterpretation}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <h3 className="mb-3 text-sm font-semibold">Target Segments</h3>
          <ul className="space-y-1.5">
            {output.targetCustomerSegments.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Primary Pain Points</h3>
          <ul className="space-y-1.5">
            {output.primaryPainPoints.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Key Capabilities</h3>
          <ul className="space-y-1.5">
            {output.keyCapabilities.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Differentiators</h3>
          <div className="flex flex-wrap gap-2">
            {output.differentiators.map((d, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-surface px-2.5 py-1 text-xs text-muted-foreground"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Competitors</h3>
          <div className="flex flex-wrap gap-2">
            {output.competitorCategories.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-surface px-2.5 py-1 text-xs text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        {meta.confidence && (
          <span>
            Confidence:{" "}
            <span className="font-medium text-foreground capitalize">{meta.confidence}</span>
          </span>
        )}
        <span>
          Provider: <span className="font-medium text-foreground">{meta.provider}</span>
        </span>
        {meta.promptVersion && (
          <span>
            Prompt: <span className="font-medium text-foreground">{meta.promptVersion}</span>
          </span>
        )}
        <span>
          Schema: <span className="font-medium text-foreground">V2</span>
        </span>
      </div>
    </div>
  );
}
