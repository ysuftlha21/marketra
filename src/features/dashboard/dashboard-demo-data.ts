// Explicit demo-only boundary. This module must only be imported by the
// opt-in dashboard demo renderer, never by the real dashboard service.
export {
  dashboardKpis,
  marketOpportunities,
  nextSteps,
  recentActivity,
  sparklineSeries,
} from "./dashboard-data";
export type { DashboardKpi, MarketOpportunity } from "./dashboard-data";
