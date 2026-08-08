export type ProblemCardId = "market" | "customers" | "outreach";

export interface ProblemCardContent {
  id: ProblemCardId;
  title: string;
  description: string;
  status: string;
}

export const problemSection = {
  badge: "THE PROBLEM",
  title: "Global expansion still runs on",
  highlightedTitle: "guesswork.",
  subtitle:
    "Growth teams spend weeks reconciling fragmented research, inconsistent assumptions, and disconnected workflows before they can make a confident market-entry decision.",
  cards: [
    {
      id: "market",
      title: "Wrong Market",
      description: "Teams expand based on assumptions instead of reliable market signals.",
      status: "Low opportunity fit",
    },
    {
      id: "customers",
      title: "Incomplete Evidence",
      description:
        "Country demand, competition, ICP context, and company signals rarely live in one decision-ready view.",
      status: "Fragmented research",
    },
    {
      id: "outreach",
      title: "Disconnected Execution",
      description:
        "Market insight is lost when teams move from country analysis into company research and local communication.",
      status: "Lost market context",
    },
  ] satisfies readonly ProblemCardContent[],
  marketPreview: {
    scoreLabel: "Market-fit score",
    score: 38,
    countries: ["United States", "Germany"],
  },
  discoveryPreview: {
    companiesLabel: "Company signals",
    buyersLabel: "Decision roles",
    companies: ["Northstar Labs", "Lumio Systems", "Bendix Cloud", "Dacenda"],
    buyers: ["Revenue leader", "Operations lead", "Technology buyer"],
  },
  outreachPreview: [
    { country: "Germany", flag: "🇩🇪" },
    { country: "Japan", flag: "🇯🇵" },
    { country: "Brazil", flag: "🇧🇷" },
  ],
  outreachMessage:
    "Hello — we help teams expand into new markets with clearer research and localized communication.",
  lowReplyLabel: "Low relevance",
  comparison: {
    without: {
      title: "Without Marketra",
      items: [
        "Weeks of research",
        "Disconnected evidence",
        "Fragmented tools",
        "Unclear next steps",
      ],
    },
    with: {
      title: "With Marketra",
      items: [
        "Market-level AI analysis",
        "Company and decision-role intelligence",
        "Localized ICPs",
        "Clear recommended actions",
      ],
    },
  },
  footerPrefix: "The problem is not a lack of data. It is",
  footerHighlight: "knowing what to do with it.",
} as const;
