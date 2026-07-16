import type {
  V1ProductAnalysisResult,
  V2ProductAnalysisResult,
} from "@/lib/providers/ai/ai.provider";

export interface ProductIntelligenceContext {
  productSummary: string;
  coreProblem: string;
  valueProposition: string;
  capabilities: string[];
  customerCategories: string[];
  buyerRoles: string[];
  businessModelInterpretation: string;
  pricingPositionInterpretation: string;
}

export type ProductIntelligence = ProductIntelligenceContext;

export function toProductIntelligenceContext(
  runOutput: Record<string, unknown>,
): ProductIntelligenceContext {
  const version = String(runOutput.schemaVersion || "v1");

  if (version === "v2") {
    const v2 = runOutput as unknown as V2ProductAnalysisResult;
    return {
      productSummary: v2.positioning || "",
      coreProblem: v2.primaryPainPoints?.[0] || "",
      valueProposition: v2.valueProposition || "",
      capabilities: v2.keyCapabilities || [],
      customerCategories: v2.targetCustomerSegments || [],
      buyerRoles: v2.buyerRoles || [],
      businessModelInterpretation: v2.businessModel || "",
      pricingPositionInterpretation: v2.pricingInterpretation || "",
    };
  }

  const v1 = runOutput as unknown as V1ProductAnalysisResult;
  return {
    productSummary: v1.productSummary || "",
    coreProblem: v1.coreProblem || "",
    valueProposition: v1.valueProposition || "",
    capabilities: v1.capabilities || [],
    customerCategories: v1.customerCategories || [],
    buyerRoles: v1.buyerRoles || [],
    businessModelInterpretation: v1.businessModelInterpretation || "",
    pricingPositionInterpretation: v1.pricingPositionInterpretation || "",
  };
}
