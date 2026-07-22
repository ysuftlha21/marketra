import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingExperience } from "@/features/pricing/components/pricing-experience";

export const metadata = { title: "Pricing" };
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
