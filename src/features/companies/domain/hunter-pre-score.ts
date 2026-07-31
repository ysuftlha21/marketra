import type { DiscoveryCompanyCandidate } from "@/lib/providers/company-discovery/company-discovery.provider";

export type HunterPreScore = {
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
};

export function calculateHunterPreScore(
  candidate: DiscoveryCompanyCandidate,
  target: {
    countryCode: string;
    industries: string[];
    employeeMin?: number;
    employeeMax?: number;
    technologies?: string[];
  },
): HunterPreScore {
  let score = 0;
  let available = 0;
  const reasons: string[] = [];
  if (candidate.countryCode) {
    available += 20;
    if (candidate.countryCode === target.countryCode) {
      score += 20;
      reasons.push("Target geography match");
    }
  }
  if (candidate.industry && candidate.industry !== "Unknown") {
    available += 30;
    if (
      target.industries.some(
        (industry) => industry.toLowerCase() === candidate.industry.toLowerCase(),
      )
    ) {
      score += 30;
      reasons.push("Target industry match");
    }
  }
  if (candidate.employeeCountEstimate !== undefined) {
    available += 20;
    const min = target.employeeMin ?? 0;
    const max = target.employeeMax ?? Number.MAX_SAFE_INTEGER;
    if (candidate.employeeCountEstimate >= min && candidate.employeeCountEstimate <= max) {
      score += 20;
      reasons.push("Target company size match");
    }
  }
  if (target.technologies?.length && candidate.technologySignals.length) {
    available += 20;
    if (
      candidate.technologySignals.some((technology) => target.technologies?.includes(technology))
    ) {
      score += 20;
      reasons.push("Target technology signal match");
    }
  }
  if (candidate.normalizedDomain) {
    available += 10;
    score += 10;
    reasons.push("Verified company domain available");
  }
  return {
    score: Math.round((score / Math.max(available, 1)) * 100),
    confidence: available >= 70 ? "high" : available >= 40 ? "medium" : "low",
    reasons,
  };
}
