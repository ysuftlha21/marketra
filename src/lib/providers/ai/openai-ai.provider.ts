import type { AiProvider } from "./ai.provider";
import {
  countryMarketAnalysisResultSchema,
  countrySpecificIcpResultSchema,
  icpProfileSchema,
  matchExplanationSchema,
  outreachContentSchema,
  productAnalysisResultSchema,
  v1ProductAnalysisResultSchema,
  v2ProductAnalysisResultSchema,
} from "./ai.provider";
import type {
  CountryMarketAnalysisInput,
  CountrySpecificIcpInput,
  EvaluateCompanyInput,
  IcpGenerationInput,
  OutreachInput,
  ProductAnalysisInput,
  V1ProductAnalysisInput,
  V2ProductAnalysisInput,
} from "./ai.provider";
import { StructuredOpenAiClient, type OpenAiClientConfig } from "./openai-client";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";
  readonly isMock = false;
  private readonly client: StructuredOpenAiClient;

  constructor(config: OpenAiClientConfig) {
    this.client = new StructuredOpenAiClient(config);
  }

  analyzeProduct(input: ProductAnalysisInput) {
    return this.client.generate("product_analysis_legacy", input, productAnalysisResultSchema);
  }
  analyzeProductV1(input: V1ProductAnalysisInput) {
    return this.client.generate("product_analysis_v1", input, v1ProductAnalysisResultSchema);
  }
  analyzeProductV2(input: V2ProductAnalysisInput) {
    return this.client.generate("product_analysis_v2", input, v2ProductAnalysisResultSchema);
  }
  generateIcp(input: IcpGenerationInput) {
    return this.client.generate("icp_generation", input, icpProfileSchema);
  }
  evaluateCompany(input: EvaluateCompanyInput) {
    return this.client.generate("company_evaluation", input, matchExplanationSchema);
  }
  generateOutreach(input: OutreachInput) {
    return this.client.generate("outreach_legacy", input, outreachContentSchema);
  }
  analyzeCountryMarketV1(input: CountryMarketAnalysisInput) {
    return this.client.generate(
      "country_market_analysis_v1",
      input,
      countryMarketAnalysisResultSchema,
    );
  }
  generateCountrySpecificIcpV1(input: CountrySpecificIcpInput) {
    return this.client.generate("country_specific_icp_v1", input, countrySpecificIcpResultSchema);
  }
}
