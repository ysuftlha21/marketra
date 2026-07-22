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
    "SaaS teams spend weeks combining fragmented data, generic contact lists, and disconnected tools before they can make a confident market-entry decision.",
  cards: [
    {
      id: "market",
      title: "Wrong Market",
      description: "Teams expand based on assumptions instead of reliable market signals.",
      status: "Low opportunity fit",
    },
    {
      id: "customers",
      title: "Wrong Customers",
      description:
        "Global databases return thousands of companies, but very few match the local ICP.",
      status: "Low-quality targeting",
    },
    {
      id: "outreach",
      title: "Generic Outreach",
      description:
        "The same message is used across countries with different languages and buying behavior.",
      status: "Low response rates",
    },
  ] satisfies readonly ProblemCardContent[],
  marketPreview: {
    scoreLabel: "Market-fit score",
    score: 38,
    countries: ["United States", "Germany"],
  },
  discoveryPreview: {
    companiesLabel: "Company Discovery",
    buyersLabel: "Buyer Discovery",
    companies: ["Northstar Labs", "Lumio Systems", "Bendix Cloud", "Dacenda"],
    buyers: ["Revenue leader", "Operations lead", "Technology buyer"],
  },
  outreachPreview: [
    { country: "Germany", flag: "🇩🇪" },
    { country: "Japan", flag: "🇯🇵" },
    { country: "Brazil", flag: "🇧🇷" },
  ],
  outreachMessage:
    "Hello — we help teams expand into new markets with clearer targeting and localized outreach.",
  lowReplyLabel: "Low reply",
  comparison: {
    without: {
      title: "Without Marketra",
      items: [
        "Weeks of research",
        "Generic company lists",
        "Fragmented tools",
        "Unclear next steps",
      ],
    },
    with: {
      title: "With Marketra",
      items: [
        "Market-level AI analysis",
        "Qualified companies and buyers",
        "Localized ICPs",
        "Clear recommended actions",
      ],
    },
  },
  footerPrefix: "The problem is not a lack of data. It is",
  footerHighlight: "knowing what to do with it.",
} as const;
