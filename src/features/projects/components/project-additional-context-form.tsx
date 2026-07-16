"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProjectAdditionalContextFormProps {
  initialData?: Record<string, unknown> | null;
}

export function ProjectAdditionalContextForm({ initialData }: ProjectAdditionalContextFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Additional Product Context</h3>
        <p className="text-sm text-muted-foreground">
          Provide more details to improve the accuracy of future analyses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priorityRegions">Priority Regions</Label>
          <Textarea
            id="priorityRegions"
            name="priorityRegions"
            defaultValue={(initialData?.priorityRegions as string) || ""}
            placeholder="e.g. Western Europe, DACH, North America"
            className="h-20 resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="countryDataCoverage">Country Data Coverage</Label>
          <Textarea
            id="countryDataCoverage"
            name="countryDataCoverage"
            defaultValue={(initialData?.countryDataCoverage as string) || ""}
            placeholder="e.g. Which countries does your product data cover well?"
            className="h-20 resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crmIntegrations">CRM Integrations</Label>
          <Textarea
            id="crmIntegrations"
            name="crmIntegrations"
            defaultValue={(initialData?.crmIntegrations as string) || ""}
            placeholder="e.g. Salesforce, HubSpot"
            className="h-20 resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEvidence">Customer Evidence & Case Studies</Label>
          <Textarea
            id="customerEvidence"
            name="customerEvidence"
            defaultValue={(initialData?.customerEvidence as string) || ""}
            placeholder="e.g. Notable logos, success stories"
            className="h-20 resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knownCompetitors">Known Competitors</Label>
          <Textarea
            id="knownCompetitors"
            name="knownCompetitors"
            defaultValue={(initialData?.knownCompetitors as string) || ""}
            placeholder="e.g. Main alternatives customers compare you against"
            className="h-20 resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="technologyStack">Technology Stack</Label>
          <Textarea
            id="technologyStack"
            name="technologyStack"
            defaultValue={(initialData?.technologyStack as string) || ""}
            placeholder="e.g. Built on AWS, Python, React"
            className="h-20 resize-none"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="additionalNotes">Additional Notes</Label>
          <Textarea
            id="additionalNotes"
            name="additionalNotes"
            defaultValue={(initialData?.additionalNotes as string) || ""}
            placeholder="Any other context that would help understand your product?"
            className="h-20 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
