export interface ScoringInput {
  industry: string;
  targetIndustries: string[];
  employeeMin: number | null;
  employeeMax: number | null;
  targetEmployeeMin: number | null;
  targetEmployeeMax: number | null;
  countryCode: string;
  targetCountryCode: string;
  revenueMin: number | null;
  revenueMax: number | null;
  companyType: string | null;
  targetCompanyTypes: string[];
  technologySignals: string[];
  targetTechnologySignals: string[];
  qualificationSignals: string[];
  purchaseTriggers: string[];
  disqualificationSignals: string[];
  hasDomain: boolean;
  hasEmployeeData: boolean;
  hasRevenueData: boolean;
}

export interface ScoringOutput {
  fitScore: number;
  fitGrade: "strong" | "medium" | "weak" | "disqualified";
  qualificationReasons: string[];
  disqualificationReasons: string[];
  matchedSignals: string[];
  missingSignals: string[];
  confidenceScore: number;
  scoringSnapshot: Record<string, unknown>;
}

const WEIGHTS = {
  industryFit: 25,
  companySizeFit: 15,
  geographyFit: 10,
  revenueFit: 10,
  companyTypeFit: 10,
  technologySignalFit: 15,
  purchaseTriggerFit: 5,
  qualificationSignalFit: 5,
  disqualificationPenalty: -30,
  missingDataPenalty: -15,
} as const;

export function calculateFitScore(input: ScoringInput): ScoringOutput {
  const qualificationReasons: string[] = [];
  const disqualificationReasons: string[] = [];
  const matchedSignals: string[] = [];
  const missingSignals: string[] = [];

  let score = 50;
  let confidence = 70;
  let grade: ScoringOutput["fitGrade"] = "medium";

  // Industry fit
  const industryMatch =
    input.targetIndustries.length === 0 ||
    input.targetIndustries.some((ti) => input.industry.toLowerCase().includes(ti.toLowerCase()));
  if (industryMatch && input.targetIndustries.length > 0) {
    score += WEIGHTS.industryFit * 0.8;
    qualificationReasons.push("Industry matches target ICP");
    matchedSignals.push("industry_match");
  } else if (input.targetIndustries.length > 0) {
    score -= WEIGHTS.industryFit * 0.3;
    disqualificationReasons.push("Industry does not match ICP targets");
    missingSignals.push("industry_match");
  }

  // Company size fit
  const hasSizeData = input.employeeMin !== null || input.employeeMax !== null;
  const hasTargetSize = input.targetEmployeeMin !== null || input.targetEmployeeMax !== null;
  if (hasSizeData && hasTargetSize) {
    const cMin = input.employeeMin ?? 0;
    const cMax = input.employeeMax ?? Infinity;
    const tMin = input.targetEmployeeMin ?? 0;
    const tMax = input.targetEmployeeMax ?? Infinity;
    if (cMax >= tMin && cMin <= tMax) {
      score += WEIGHTS.companySizeFit;
      qualificationReasons.push("Company size fits target range");
      matchedSignals.push("company_size_match");
    } else {
      score -= WEIGHTS.companySizeFit * 0.5;
      disqualificationReasons.push("Company size outside target range");
      missingSignals.push("company_size_match");
    }
  } else if (hasTargetSize) {
    confidence -= 15;
    missingSignals.push("company_size_data");
  }

  // Geography fit
  if (input.countryCode === input.targetCountryCode) {
    score += WEIGHTS.geographyFit;
    qualificationReasons.push("Located in target country");
    matchedSignals.push("geography_match");
  } else {
    score -= WEIGHTS.geographyFit * 0.3;
    disqualificationReasons.push("Not in target country");
  }

  // Revenue fit
  if (input.revenueMin !== null || input.revenueMax !== null) {
    score += WEIGHTS.revenueFit * 0.5;
    qualificationReasons.push("Revenue data available");
    matchedSignals.push("revenue_data");
  } else {
    confidence -= 10;
    missingSignals.push("revenue_data");
  }

  // Company type fit
  if (input.companyType && input.targetCompanyTypes.length > 0) {
    if (input.targetCompanyTypes.some((t) => t === input.companyType)) {
      score += WEIGHTS.companyTypeFit;
      qualificationReasons.push("Company type matches ICP");
      matchedSignals.push("company_type_match");
    } else {
      score -= WEIGHTS.companyTypeFit * 0.3;
      disqualificationReasons.push("Company type does not match ICP");
    }
  }

  // Technology signal fit
  if (input.targetTechnologySignals.length > 0 && input.technologySignals.length > 0) {
    const matched = input.targetTechnologySignals.filter((ts) =>
      input.technologySignals.some((cs) => cs.toLowerCase().includes(ts.toLowerCase())),
    );
    if (matched.length > 0) {
      const gain =
        (matched.length / input.targetTechnologySignals.length) * WEIGHTS.technologySignalFit;
      score += gain;
      matched.forEach((s) => matchedSignals.push(`tech_${s}`));
      qualificationReasons.push(`Matched ${matched.length} technology signal(s)`);
    }
  }

  // Purchase trigger fit
  if (input.purchaseTriggers.length > 0) {
    score += WEIGHTS.purchaseTriggerFit;
    qualificationReasons.push("Purchase triggers identified");
    matchedSignals.push("purchase_triggers");
  }

  // Qualification signal fit
  if (input.qualificationSignals.length > 0) {
    score += WEIGHTS.qualificationSignalFit;
    qualificationReasons.push("Qualification signals present");
    matchedSignals.push("qualification_signals");
  }

  // Disqualification penalties
  if (input.disqualificationSignals.length > 0) {
    score += WEIGHTS.disqualificationPenalty;
    input.disqualificationSignals.forEach((ds) => {
      disqualificationReasons.push(`Disqualification signal: ${ds}`);
    });
    confidence -= 10;
  }

  // Hard disqualification: no domain
  if (!input.hasDomain) {
    score = Math.min(score, 20);
    disqualificationReasons.push("No website domain available — limited verification");
    grade = "weak";
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));
  confidence = Math.max(0, Math.min(100, confidence));

  // Grade assignment
  if (score >= 70) grade = "strong";
  else if (score >= 40) grade = "medium";
  else if (score > 0) grade = "weak";
  else grade = "disqualified";

  return {
    fitScore: Math.round(score),
    fitGrade: grade,
    qualificationReasons,
    disqualificationReasons,
    matchedSignals,
    missingSignals,
    confidenceScore: Math.round(confidence),
    scoringSnapshot: {
      weights: WEIGHTS,
      inputSummary: {
        hasDomain: input.hasDomain,
        industryCount: input.targetIndustries.length,
        techSignalCount: input.targetTechnologySignals.length,
      },
    },
  };
}
