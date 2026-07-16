import { AnalysisOutputV1 } from "./analysis-output-v1";
import { AnalysisOutputV2 } from "./analysis-output-v2";
import type { V2ProductAnalysisResult } from "@/lib/providers/ai/ai.provider";

export function ProductAnalysisView({
  output,
  meta,
}: {
  output: Record<string, unknown>;
  meta: { provider: string; promptVersion: string | null; confidence: string };
}) {
  const version = output.schemaVersion || "v1";

  if (version === "v2") {
    return <AnalysisOutputV2 output={output as unknown as V2ProductAnalysisResult} meta={meta} />;
  }

  return <AnalysisOutputV1 output={output} meta={meta} />;
}
