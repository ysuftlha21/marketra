import type { ProviderResult } from "../provider-types";
import type {
  DecisionRoleProvider,
  DecisionRoleGenerationInput,
  DecisionRolesResult,
  DecisionRole,
} from "./decision-roles.provider";

export class MockDecisionRoleProvider implements DecisionRoleProvider {
  id = "mock-decision-roles";
  version = "1.0.0";

  async generateRoles(
    input: DecisionRoleGenerationInput,
  ): Promise<ProviderResult<DecisionRolesResult>> {
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Base properties derived from company size/industry
    const isEnterprise = input.companyEmployeeMax && input.companyEmployeeMax > 1000;
    const isTech =
      input.companyIndustry.toLowerCase().includes("tech") ||
      input.companyIndustry.toLowerCase().includes("software");

    const primaryRole: DecisionRole = {
      roleKey: isTech ? "cto_or_vp_eng" : isEnterprise ? "vp_operations" : "ceo_founder",
      roleTitle: isTech
        ? "VP of Engineering"
        : isEnterprise
          ? "VP of Operations"
          : "Chief Executive Officer",
      roleFamily: isTech ? "Technology" : isEnterprise ? "Operations" : "Executive",
      department: isTech ? "Engineering" : isEnterprise ? "Operations" : "C-Suite",
      buyingRole: "decision_maker",
      priority: "primary",
      fitScore: 92,
      confidenceScore: 85,
      reasoning: "Highest authority over this specific problem domain.",
      evidence: {
        problemOwnership: "Directly accountable for the metrics this product improves.",
        budgetInfluence: "Holds the primary budget for this department.",
        decisionAuthority: "Final sign-off on new vendor additions.",
        operationalImpact: "Will oversee the deployment.",
        userRelevance: "Team will be the primary users.",
        icpAlignment: "Perfect match with approved ICP buyer roles.",
        industryAlignment: "Standard structure for this industry.",
        companySizeAlignment: "Expected role for a company of this size.",
        countryRelevance: "Common title locally.",
        evidenceQuality: "High confidence based on typical organizational charts.",
      },
      likelyPainPoints:
        input.icpPains.length > 0
          ? input.icpPains.slice(0, 2)
          : ["Budget constraints", "Inefficiency"],
      likelyObjections: ["Implementation time", "Security compliance"],
      recommendedMessageAngles: ["Focus on ROI", "Highlight ease of integration"],
      titleVariants: isTech
        ? ["CTO", "Head of Engineering"]
        : isEnterprise
          ? ["COO", "Director of Ops"]
          : ["Founder", "Managing Director"],
      seniorityLevels: ["C-Level", "VP"],
      companySizeRelevance: isEnterprise ? "Standard for enterprise" : "Common for small teams",
      countryRelevance: "Globally applicable",
    };

    const secondaryRole: DecisionRole = {
      roleKey: "champion_manager",
      roleTitle: isTech ? "Engineering Manager" : "Operations Manager",
      roleFamily: isTech ? "Technology" : "Operations",
      department: isTech ? "Engineering" : "Operations",
      buyingRole: "champion",
      priority: "secondary",
      fitScore: 85,
      confidenceScore: 90,
      reasoning: "Will feel the pain most acutely and advocate for the solution.",
      evidence: {
        problemOwnership: "Experiences the daily friction.",
        budgetInfluence: "Can request budget but cannot approve.",
        decisionAuthority: "Strong influencer.",
        operationalImpact: "Directly affected by process improvements.",
        userRelevance: "Primary end user.",
        icpAlignment: "Matches ICP user profiles.",
        industryAlignment: "Standard for this industry.",
        companySizeAlignment: "Common in companies of this scale.",
        countryRelevance: "Typical hierarchy.",
        evidenceQuality: "Based on product use case.",
      },
      likelyPainPoints: ["Manual reporting", "Siloed data"],
      likelyObjections: ["Learning curve", "Data migration"],
      recommendedMessageAngles: ["Focus on time savings", "Highlight automation"],
      titleVariants: ["Team Lead", "Department Head"],
      seniorityLevels: ["Director", "Manager"],
      companySizeRelevance: "Relevant across sizes",
      countryRelevance: "Globally applicable",
    };

    const procurementRole: DecisionRole = {
      roleKey: "procurement",
      roleTitle: "Head of Procurement",
      roleFamily: "Finance",
      department: "Finance/Procurement",
      buyingRole: "economic_buyer",
      priority: "supporting",
      fitScore: 60,
      confidenceScore: 70,
      reasoning: "Required for enterprise vendor approval.",
      evidence: {
        problemOwnership: "None.",
        budgetInfluence: "Controls payment terms.",
        decisionAuthority: "Can block if terms are unfavorable.",
        operationalImpact: "None.",
        userRelevance: "None.",
        icpAlignment: "Enterprise specific.",
        industryAlignment: "Standard for enterprise.",
        companySizeAlignment: "Only exists in large companies.",
        countryRelevance: "Standard.",
        evidenceQuality: "Derived from company employee count.",
      },
      likelyPainPoints: ["Vendor sprawl", "Unpredictable pricing"],
      likelyObjections: ["Not an approved vendor", "Missing compliance certifications"],
      recommendedMessageAngles: ["Focus on consolidated billing", "Enterprise security"],
      titleVariants: ["CFO", "Finance Director"],
      seniorityLevels: ["VP", "Director"],
      companySizeRelevance: "Highly relevant for Enterprise",
      countryRelevance: "Standard",
    };

    const roles = [primaryRole, secondaryRole];
    if (isEnterprise) {
      roles.push(procurementRole);
    }

    const missing = input.companyEmployeeMax
      ? []
      : ["Company size is unknown, which reduces confidence in role hierarchy."];

    return {
      data: {
        schemaVersion: "1.0.0",
        companySummary: `A ${isTech ? "technology" : "standard"} company operating in ${input.companyIndustry}.`,
        buyingCommitteeSummary: `The committee is led by the ${primaryRole.roleTitle}, supported by a ${secondaryRole.roleTitle} as the champion.`,
        recommendedRoles: roles,
        contactSequence: [
          {
            roleKey: secondaryRole.roleKey,
            reason: "To build ground-level support.",
            desiredOutcome: "Gain a champion and uncover internal pain points.",
            informationToGather: "Current workflow metrics and specific pain points.",
          },
          {
            roleKey: primaryRole.roleKey,
            reason: "To secure budget and approval.",
            desiredOutcome: "Project greenlight.",
            informationToGather: "Budget cycle timeline.",
          },
        ],
        missingInformation: missing,
        warnings: [],
        overallConfidence: input.companyEmployeeMax ? 85 : 65,
      },
      meta: {
        providerName: this.id,
        isMock: true,
        durationMs: 1200,
        tokens: 400,
        estimatedCostUsd: 0.001,
      },
    };
  }
}
