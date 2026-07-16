export function AnalysisOutputV1({
  output,
  meta,
}: {
  output: Record<string, unknown>;
  meta: { provider: string; promptVersion: string | null; confidence: string };
}) {
  const summary = String(output.productSummary ?? "");
  const core = String(output.coreProblem ?? "");
  const vp = String(output.valueProposition ?? "");
  const caps = (output.capabilities ?? []) as string[];
  const pos = String(output.positioningStatement ?? "");
  const pitch = String(output.elevatorPitch ?? "");

  if (!summary) return null;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1.5 text-sm font-semibold">Product summary</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary.replace(/^\[mock\]\s*/, "")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Core problem
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {core.replace(/^\[mock\]\s*/, "")}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Value proposition
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {vp.replace(/^\[mock\]\s*/, "")}
          </p>
        </div>
      </div>
      {caps.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Capabilities</h3>
          <div className="flex flex-wrap gap-1.5">
            {caps.map((c, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-surface px-2.5 py-1 text-xs text-muted-foreground"
              >
                {c.replace(/^\[mock\]\s*/, "")}
              </span>
            ))}
          </div>
        </div>
      )}
      {pos && (
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
            Positioning
          </h3>
          <p className="text-sm italic text-foreground">{pos.replace(/^\[mock\]\s*/, "")}</p>
          {pitch && (
            <p className="mt-2 text-sm italic text-muted-foreground">
              {pitch.replace(/^\[mock\]\s*/, "")}
            </p>
          )}
        </div>
      )}
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
          Schema: <span className="font-medium text-foreground">V1</span>
        </span>
      </div>
    </div>
  );
}
