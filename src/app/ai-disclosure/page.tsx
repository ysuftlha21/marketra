import { LegalPage } from "@/features/legal/components/legal-page";
import { parseServerEnv } from "@/lib/env/env";
import { getOpenAiModelDefinition } from "@/config/openai-models";
export const metadata = { title: "AI and Demo Data Disclosure" };
export default function AiDisclosurePage() {
  const env = parseServerEnv();
  const configuredAi =
    env.DEFAULT_AI_PROVIDER === "openai"
      ? `${getOpenAiModelDefinition(env.OPENAI_MODEL).family} model family`
      : "Mock AI provider";
  return (
    <LegalPage title="AI and Demo Data Disclosure">
      <p>
        AI-assisted analysis, Decision Role recommendations, and Outreach drafts may contain
        estimates or errors and require human review. Marketra labels Mock discovery results as demo
        data and manually entered companies by provenance. Demo data is not verified external
        company intelligence.
      </p>
      <p>The currently configured analysis provider uses the {configuredAi}.</p>
    </LegalPage>
  );
}
