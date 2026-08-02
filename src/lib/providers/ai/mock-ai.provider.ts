import type {
  AiProvider,
  CountryMarketAnalysisInput,
  CountrySpecificIcpInput,
  EvaluateCompanyInput,
  IcpGenerationInput,
  OutreachInput,
  ProductAnalysisInput,
  V1ProductAnalysisInput,
  V2ProductAnalysisInput,
} from "./ai.provider";
import {
  type CountryMarketAnalysisResult,
  type CountrySpecificIcpResult,
  type IcpProfile,
  type MatchExplanation,
  type OutreachContent,
  type ProductAnalysisResult,
  type V1ProductAnalysisResult,
  type V2ProductAnalysisResult,
  buildMeta,
} from "./ai.provider";

/**
 * MockAiProvider — deterministic, clearly-marked mock data for local development
 * and tests. No network, no secrets, no real tokens.
 */
export class MockAiProvider implements AiProvider {
  readonly name = "mock-ai";
  readonly isMock = true;

  async analyzeProduct(input: ProductAnalysisInput) {
    const startedAt = Date.now();
    const data: ProductAnalysisResult = {
      isMock: true,
      productSummary: `[mock] ${input.productName} helps teams ship and scale a focused SaaS product.`,
      valueProposition:
        "[mock] Reduce time-to-market and reach the right customers in the right countries.",
      suggestedVerticals: ["B2B SaaS", "Developer tools", "Productivity"],
      suggestedPainPoints: ["Slow market entry", "Unclear ICP", "Manual outreach"],
      suggestedTechnologies: ["TypeScript", "Next.js", "Supabase"],
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async analyzeProductV1(input: V1ProductAnalysisInput): Promise<{
    data: V1ProductAnalysisResult;
    meta: ReturnType<typeof buildMeta>;
  }> {
    const startedAt = Date.now();
    const data: V1ProductAnalysisResult = {
      isMock: true,
      productSummary: `[mock] ${input.productName} helps teams streamline their SaaS operations with an intuitive platform.`,
      coreProblem:
        "[mock] Teams struggle to coordinate market entry across multiple countries efficiently.",
      valueProposition:
        "[mock] Reduce time-to-market and systematically discover the right customers in target markets.",
      capabilities: [
        "[mock] AI-powered market analysis per country",
        "[mock] Automated company discovery and matching",
        "[mock] Localized outreach generation",
      ],
      customerCategories: ["B2B SaaS companies", "Indie hackers", "Micro-SaaS founders"],
      buyerRoles: ["CEO / Founder", "Head of Growth", "Head of Sales"],
      userRoles: ["Growth marketer", "Sales development rep", "Founder"],
      businessModelInterpretation:
        "[mock] SaaS subscription with tiered pricing based on features and country coverage.",
      pricingPositionInterpretation: "[mock] Mid-market positioning with value-based pricing.",
      purchaseTriggers: [
        "Expanding to new country markets",
        "Unsatisfied with current outreach quality",
      ],
      adoptionBarriers: [
        "Limited in-house market research expertise",
        "Concerns about outreach localization quality",
      ],
      maturityObservations:
        "[mock] The product appears to be in early growth stage with clear market fit signals.",
      differentiators: ["Country-by-country analysis", "Deterministic explainable matching"],
      unsupportedClaims: ["Specific customer count claims"],
      missingInformation: [
        "Detailed technology stack",
        "Integration ecosystem",
        "Competitive landscape",
      ],
      clarificationQuestions: [
        "What is your primary revenue model?",
        "Which countries are you initially targeting?",
      ],
      positioningStatement: `[mock] ${input.productName} is the market-entry platform for SaaS founders who need systematic, country-aware customer discovery.`,
      elevatorPitch: `[mock] ${input.productName} helps you find and reach the right customers in any market.`,
      confidence: "medium",
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async analyzeProductV2(input: V2ProductAnalysisInput): Promise<{
    data: V2ProductAnalysisResult;
    meta: ReturnType<typeof buildMeta>;
  }> {
    const startedAt = Date.now();
    const data: V2ProductAnalysisResult = {
      schemaVersion: "v2",
      isMock: true,
      productCategory: "B2B SaaS Software",
      targetCustomerSegments: ["Startups", "Scale-ups", "SaaS Founders"],
      userPersonas: ["Marketing Manager", "Sales Ops", "Founder"],
      buyerRoles: ["Founder", "CEO", "VP of Revenue"],
      primaryPainPoints: [
        "Unclear which markets to enter first",
        "Difficulty finding matching companies",
        "Lack of localized context for outreach",
      ],
      jobsToBeDone: [
        "Identify high-potential target countries",
        "Generate ideal customer profiles",
        "Build a qualified lead list",
      ],
      keyCapabilities: [
        "AI-powered market analysis per country",
        "Automated company discovery and matching",
        "Localized outreach generation",
      ],
      customerBenefits: [
        "Save 40+ hours per week on market research",
        "Increase cold outreach reply rates by 3x",
        "Systematically validate new geographic markets",
      ],
      valueProposition:
        "Reduce time-to-market and systematically discover the right customers in target markets.",
      positioning: `${input.productName} is the AI-native go-to-market platform that helps B2B SaaS teams expand internationally with confidence.`,
      differentiators: [
        "Built specifically for cross-border B2B SaaS expansion",
        "Deeply integrates product context into every search",
        "No complex setup required",
      ],
      competitorCategories: [
        "General B2B databases (ZoomInfo, Apollo)",
        "Traditional market research agencies",
        "Generic AI writers",
      ],
      alternativesCustomersCurrentlyUse: [
        "Manual LinkedIn Sales Navigator searches",
        "Spreadsheets and manual web scraping",
        "Hiring expensive local market consultants",
      ],
      businessModel: "B2B SaaS subscription with tiered limits based on features and credits.",
      pricingInterpretation: "Tiered pricing with Free, Starter, Growth, and Agency plans.",
      purchaseTriggers: [
        "Raising a new round of funding for expansion",
        "Hitting growth plateaus in the domestic market",
        "Hiring the first international sales rep",
      ],
      likelyObjections: [
        "We already have Apollo/ZoomInfo",
        "Our product is too complex for AI to understand",
        "We are not ready for international expansion yet",
      ],
      adoptionBarriers: [
        "Requires dedicated sales resources to act on leads",
        "Founders may be too busy to configure the initial project",
      ],
      useCases: [
        "Planning the next country for go-to-market",
        "Building an initial lead list in a foreign language",
        "Validating product-market fit in a new region",
      ],
      strengths: [
        "End-to-end workflow from analysis to outreach",
        "Focus on quality and relevance over volume",
        "High degree of automation",
      ],
      weaknesses: [
        "Relies on external AI provider accuracy",
        "Data coverage may vary by obscure countries",
      ],
      risks: [
        "Changes in third-party API availability",
        "Intense competition in the sales intelligence space",
      ],
      assumptions: [
        "Target companies have a web presence",
        "Users have basic familiarity with sales terminology",
      ],
      evidenceExtractedFromWebsite: [
        "Mentioned 'AI-powered market analysis' on the homepage",
        "Pricing page indicates 4 distinct tiers",
      ],
      sectionConfidences: {
        productCategory: "high",
        targetCustomerSegments: "high",
        valueProposition: "medium",
      },
      missingInformation: [
        "Exact data coverage metrics by country",
        "Specific case studies or customer testimonials",
      ],
      clarificationQuestions: [
        {
          key: "priority_regions",
          question: "Which regions are currently your top priority?",
          category: "Strategy",
          isRequired: true,
        },
        {
          key: "crm_integrations",
          question: "Do you have existing CRM integrations?",
          category: "Integration",
          isRequired: false,
        },
      ],
      confidence: "medium",
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async generateIcp(input: IcpGenerationInput): Promise<{
    data: IcpProfile;
    meta: ReturnType<typeof buildMeta>;
  }> {
    const startedAt = Date.now();
    const data: IcpProfile = {
      isMock: true,
      countryCode: input.countryCode.toUpperCase(),
      industryFit: ["B2B SaaS", "Software agencies"],
      employeeRange: "11-50",
      companyType: "Private company",
      painPoints: ["Market entry", "Outreach quality"],
      technologySignals: ["Modern web stack", "Cloud-native"],
      buyingSignals: ["Hiring sales roles", "Recent funding round"],
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async evaluateCompany(input: EvaluateCompanyInput) {
    const startedAt = Date.now();
    const data: MatchExplanation = {
      isMock: true,
      positiveReasons: [
        `[mock] ${input.companyName} targets a relevant vertical in ${input.companyCountryCode}.`,
        "[mock] Employee range overlaps with the configured ICP band.",
      ],
      negativeReasons: ["[mock] Public buying signals are limited."],
      missingData: ["[mock] Technology stack not enriched yet."],
      narrative: `[mock] ${input.companyName} is a partial fit awaiting enrichment.`,
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async generateOutreach(input: OutreachInput) {
    const startedAt = Date.now();
    const data: OutreachContent = {
      isMock: true,
      language: input.language,
      subject: `[mock] Quick idea for ${input.companyName}`,
      body: `[mock] Hello ${input.recipientRole}, I noticed ${input.companyName} and thought Marketra could help with market entry into ${input.language.toUpperCase()}-speaking markets.`,
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async analyzeCountryMarketV1(input: CountryMarketAnalysisInput): Promise<{
    data: CountryMarketAnalysisResult;
    meta: ReturnType<typeof buildMeta>;
  }> {
    const startedAt = Date.now();
    const data: CountryMarketAnalysisResult = {
      isMock: true,
      countryCode: input.countryCode.toUpperCase(),
      executiveSummary: `[mock] ${input.productName} shows moderate product-country fit for ${input.countryName}. The market is accessible with standard SaaS go-to-market motions.`,
      productCountryFit: `[mock] ${input.productName} addresses needs common in ${input.countryName}'s SaaS market. The value proposition translates well with minor localization.`,
      strongestFitSignals: [
        "[mock] Digital adoption in the target market supports SaaS tools",
        "[mock] Core problem is relevant across regions",
        "[mock] Self-serve purchasing model aligns with local expectations",
      ],
      weakestFitSignals: [
        "[mock] Language localization may be required for full market penetration",
        "[mock] Enterprise procurement may require additional compliance documentation",
      ],
      relevantCustomerSegments: [
        "[mock] Mid-market B2B SaaS companies",
        "[mock] Growth-stage startups with international ambitions",
      ],
      likelyBuyerRoles: ["CEO / Founder", "Head of Growth", "Head of Sales"],
      localizationRequirements:
        "[mock] English is sufficient for initial entry. Local-language support would accelerate adoption.",
      languageConsiderations:
        "[mock] Primary business language matches the product language. Secondary language support may be needed for full coverage.",
      pricingConsiderations:
        "[mock] Current pricing is competitive for the market. Annual billing with local currency support would improve conversion.",
      paymentProcurementConsiderations:
        "[mock] Credit card self-serve works for SMB. Bank transfer and invoicing expected for enterprise.",
      salesCycleExpectations:
        "[mock] 2-4 weeks for SMB self-serve, 2-3 months for mid-market with demo.",
      preferredEntryMotions: [
        "[mock] Content-led inbound",
        "[mock] Product-led growth",
        "[mock] Targeted outbound to high-fit segments",
      ],
      likelyAcquisitionChannels: [
        "[mock] LinkedIn organic + paid",
        "[mock] SaaS review platforms",
        "[mock] Industry communities",
      ],
      adoptionBarriers: [
        "[mock] Limited local brand awareness",
        "[mock] Localization investment required for non-English segments",
      ],
      regulatoryConsiderations:
        "[mock] Standard business regulations apply. Data processing agreement may be required for enterprise.",
      dataProtectionConsiderations:
        "[mock] GDPR-equivalent expectations. Data residency preferences vary by segment.",
      operationalChallenges: [
        "[mock] Timezone differences for support",
        "[mock] Local payment provider integration",
      ],
      assumptionsUsed: [
        "[mock] Product analysis is current and complete",
        "[mock] Market intelligence data is representative",
      ],
      unresolvedQuestions: [
        "[mock] What is the competitive landscape in this market?",
        "[mock] Are there local pricing anchors that affect willingness to pay?",
      ],
      validationExperiments: [
        "[mock] Run 5 customer discovery interviews in the target market",
        "[mock] Test ad campaigns with localized landing page",
        "[mock] Pilot with 2-3 design partners",
      ],
      entryRecommendation: "investigate",
      confidence: "medium",
      evidenceLimitations: [
        "[mock] Market intelligence is mock data — not verified",
        "[mock] No competitor analysis performed",
        "[mock] No customer interviews conducted",
      ],
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }

  async generateCountrySpecificIcpV1(input: CountrySpecificIcpInput) {
    const startedAt = Date.now();
    const data: CountrySpecificIcpResult = {
      schemaVersion: "1",
      isMock: true,
      profileName: `[mock] ICP for ${input.countryName} — ${input.productName}`,
      summary: `[mock] Mid-market B2B SaaS companies in ${input.countryName} that need ${input.productName}'s capabilities to improve ${input.coreProblem.toLowerCase()}.`,
      countryCode: input.countryCode,
      countryName: input.countryName,
      primaryIndustries: [
        {
          name: "B2B SaaS",
          fit: "primary" as const,
          reasoning: "[mock] Direct alignment with product value proposition.",
        },
      ],
      secondaryIndustries: [],
      excludedIndustries: [],
      nicheSegments: [],
      companyAttributes: {
        employeeRange: "[mock] 11-200",
        maturity: "[mock] Growth-stage and mid-market",
        operatingModel: "[mock] B2B SaaS with recurring revenue",
        geographicPresence: "[mock] Primarily operating in the target country",
        digitalMaturity: "[mock] Moderate to high — uses modern SaaS tools",
        technologyMaturity: "[mock] Cloud-native with API integrations",
        buyingReadiness: "[mock] Likely evaluating or already using category tools",
      },
      buyerRoles: [
        {
          title: "[mock] Head of Growth",
          department: "Growth / Marketing",
          seniority: "Director",
          roleInPurchase: "Decision maker",
          keyConcerns: ["[mock] Time to market", "[mock] Team efficiency"],
          successMetrics: ["[mock] Faster expansion", "[mock] Higher qualified pipeline"],
          influenceLevel: "High",
        },
      ],
      userRoles: [
        {
          title: "[mock] Growth Analyst",
          dailyWorkflow: "[mock] Research markets and coordinate outreach",
          mainPains: ["[mock] Manual research is slow"],
          desiredOutcomes: ["[mock] Structured market data"],
          adoptionConcerns: "[mock] Learning curve",
        },
      ],
      primaryPains: [
        "[mock] Slow market-entry decisions",
        "[mock] Unclear target-customer profile",
      ],
      secondaryPains: [],
      desiredBusinessOutcomes: [
        "[mock] Accelerate market entry by 2×",
        "[mock] Higher qualified pipeline",
      ],
      desiredOperationalOutcomes: [
        "[mock] Reduce research time per market",
        "[mock] Standardize ICP generation",
      ],
      purchaseTriggers: [
        "[mock] Expanding to new countries",
        "[mock] Unsatisfactory current outreach quality",
      ],
      qualificationSignals: [
        "[mock] Has dedicated growth or sales role",
        "[mock] Uses modern SaaS stack",
      ],
      disqualificationSignals: [
        "[mock] Sole proprietor without team",
        "[mock] Local-only business",
      ],
      objections: [
        {
          objection: "[mock] Already using manual research",
          underlyingConcern: "[mock] Perceived switching cost",
          evidenceNeeded: "[mock] Time-saving case study",
        },
      ],
      technologyContext: null,
      procurementContext: null,
      localizationRequirements: null,
      assumptions: [
        "[mock] Product analysis is current",
        "[mock] Market intelligence is representative",
      ],
      missingInformation: [
        "[mock] Specific competitor landscape",
        "[mock] Local pricing benchmarks",
      ],
      validationQuestions: [
        "[mock] Interview 5 target-company buyers",
        "[mock] Validate pain points with surveys",
      ],
      confidence: "medium",
      confidenceReason: "[mock] Strong product-market alignment but limited local buyer evidence.",
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt, { tokens: 0 }) };
  }
}
