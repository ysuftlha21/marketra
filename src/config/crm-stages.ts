import { z } from "zod";

export const crmStageIdSchema = z.enum([
  "discovered",
  "qualified",
  "outreach-pending",
  "outreach-sent",
  "engaged",
  "meeting-booked",
  "won",
  "lost",
]);
export type CrmStageId = z.infer<typeof crmStageIdSchema>;

export const crmStageSchema = z.object({
  id: crmStageIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  order: z.number().int().nonnegative(),
  color: z.enum(["neutral", "info", "primary", "accent", "success", "warning", "danger"]),
});
export type CrmStage = z.infer<typeof crmStageSchema>;

export const crmStages: readonly CrmStage[] = [
  {
    id: "discovered",
    name: "Discovered",
    description: "Found companies matching an ICP",
    order: 0,
    color: "neutral",
  },
  {
    id: "qualified",
    name: "Qualified",
    description: "Reviewed and accepted for outreach",
    order: 1,
    color: "info",
  },
  {
    id: "outreach-pending",
    name: "Outreach pending",
    description: "Outreach drafted but not sent",
    order: 2,
    color: "primary",
  },
  {
    id: "outreach-sent",
    name: "Outreach sent",
    description: "Message sent to the company",
    order: 3,
    color: "accent",
  },
  {
    id: "engaged",
    name: "Engaged",
    description: "Company replied or interacted",
    order: 4,
    color: "warning",
  },
  {
    id: "meeting-booked",
    name: "Meeting booked",
    description: "A meeting is scheduled",
    order: 5,
    color: "success",
  },
  { id: "won", name: "Won", description: "Company became a customer", order: 6, color: "success" },
  {
    id: "lost",
    name: "Lost",
    description: "Company no longer in pursuit",
    order: 7,
    color: "danger",
  },
] as const;

export function getCrmStage(id: string): CrmStage | undefined {
  return crmStages.find((s) => s.id === id);
}

export function getCrmStagesOrdered(): readonly CrmStage[] {
  return [...crmStages].sort((a, b) => a.order - b.order);
}
