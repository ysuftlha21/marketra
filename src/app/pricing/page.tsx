import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingExperience } from "@/features/pricing/components/pricing-experience";

const description =
  "Choose the right Marketra plan to discover companies, analyze markets, find buyers, and grow globally.";

export const metadata: Metadata = {
  title: { absolute: "Marketra Pricing" },
  description,
  alternates: { canonical: "https://getmarketra.com/pricing" },
  openGraph: {
    title: "Marketra Pricing",
    description,
    url: "https://getmarketra.com/pricing",
    siteName: "Marketra",
    type: "website",
  },
};
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0d0d12]">
      <MarketingHeader />
      <main>
        <PricingExperience headingLevel="h1" />
      </main>
      <MarketingFooter />
    </div>
  );
}
