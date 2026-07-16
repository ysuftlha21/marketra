import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  Crosshair,
  Globe2,
  Mail,
  Megaphone,
  PenLine,
  Rocket,
  Search,
  Target,
  UserRoundSearch,
  Users,
} from "lucide-react";

export interface DashboardKpi {
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  icon: LucideIcon;
  tone: "purple" | "cyan" | "amber";
}

export const dashboardKpis: DashboardKpi[] = [
  {
    title: "Target Markets",
    value: "4",
    subtitle: "Active Markets",
    trend: "+ 12%",
    icon: Target,
    tone: "purple",
  },
  {
    title: "Matched Companies",
    value: "1,842",
    subtitle: "Total Found",
    trend: "+ 6.5%",
    icon: Building2,
    tone: "cyan",
  },
  {
    title: "Decision Makers",
    value: "11,490",
    subtitle: "Verified",
    trend: "+ 5.2%",
    icon: Users,
    tone: "amber",
  },
  {
    title: "AI Campaigns",
    value: "7",
    subtitle: "Running",
    trend: "+ 1",
    icon: Rocket,
    tone: "purple",
  },
  {
    title: "Opportunities",
    value: "$1.8M",
    subtitle: "Est. ARR Potential",
    trend: "+ 18%",
    icon: BarChart3,
    tone: "purple",
  },
];

export interface MarketOpportunity {
  country: string;
  flag: string;
  score: number;
  marketSize: string;
  competition: "Low" | "Medium" | "High";
  ease: "High" | "Medium" | "Low";
  arr: string;
}

export const marketOpportunities: MarketOpportunity[] = [
  {
    country: "Germany",
    flag: "🇩🇪",
    score: 92,
    marketSize: "$2.1B",
    competition: "Low",
    ease: "High",
    arr: "$1.8M",
  },
  {
    country: "United States",
    flag: "🇺🇸",
    score: 94,
    marketSize: "$6.3B",
    competition: "Medium",
    ease: "High",
    arr: "$3.2M",
  },
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    score: 88,
    marketSize: "$1.2B",
    competition: "Low",
    ease: "Medium",
    arr: "$950K",
  },
  {
    country: "Canada",
    flag: "🇨🇦",
    score: 90,
    marketSize: "$650M",
    competition: "Low",
    ease: "High",
    arr: "$720K",
  },
  {
    country: "Japan",
    flag: "🇯🇵",
    score: 81,
    marketSize: "$1.5B",
    competition: "High",
    ease: "Low",
    arr: "$480K",
  },
];

export const nextSteps = [
  { title: "Company Discovery", subtitle: "1,240 companies found", action: "View", icon: Search },
  {
    title: "Buyer Discovery",
    subtitle: "680 decision makers",
    action: "View",
    icon: UserRoundSearch,
  },
  { title: "ICP Builder", subtitle: "Optimize your ICP", action: "Open", icon: PenLine },
  { title: "AI Outreach", subtitle: "Create personalized campaigns", action: "Open", icon: Mail },
];

export const recentActivity = [
  {
    title: "New market analysis completed",
    subtitle: "Germany SaaS Market",
    time: "10:48 AM",
    icon: Crosshair,
  },
  {
    title: "AI campaign started",
    subtitle: "UK Series A Campaign",
    time: "10:31 AM",
    icon: Megaphone,
  },
  {
    title: "Buyer discovered",
    subtitle: "CTO at FinTech Solutions",
    time: "10:15 AM",
    icon: Users,
  },
  { title: "New company match", subtitle: "Linear GmbH", time: "09:55 AM", icon: Building2 },
  { title: "ICP updated", subtitle: "SaaS FinTech ICP v2", time: "09:32 AM", icon: Globe2 },
];

export const sparklineSeries = {
  companies: [
    12, 16, 15, 22, 18, 27, 20, 31, 23, 35, 27, 39, 30, 44, 35, 49, 38, 35, 26, 33, 31, 34, 36,
  ],
  decisionMakers: [
    9, 12, 14, 18, 13, 21, 16, 25, 17, 28, 22, 33, 28, 40, 34, 44, 39, 48, 43, 47, 46, 49, 50,
  ],
  response: [
    8, 10, 14, 12, 18, 16, 23, 19, 28, 20, 31, 25, 39, 22, 17, 11, 18, 27, 22, 33, 29, 41, 37, 49,
  ],
  opportunities: [
    8, 12, 21, 26, 34, 38, 45, 49, 47, 55, 62, 68, 72, 70, 66, 65, 69, 74, 78, 82, 83, 80, 79, 84,
    90, 95, 98, 104, 108,
  ],
};
