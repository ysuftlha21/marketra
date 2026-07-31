import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const buyerDiscoveryProviderIdSchema = z.enum(["mock", "hunter"]);
export type BuyerDiscoveryProviderId = z.infer<typeof buyerDiscoveryProviderIdSchema>;
export const buyerContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  jobTitle: z.string().optional(),
  seniority: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional(),
  emailConfidence: z.number().min(0).max(100).optional(),
  linkedinUrl: z.string().url().optional(),
  source: z.literal("hunter"),
  fetchedAt: z.string().datetime(),
});
export type BuyerContact = z.infer<typeof buyerContactSchema>;
export type BuyerDiscoveryInput = {
  domain: string;
  department?: string;
  seniority?: string;
  limit?: number;
  offset?: number;
};
export interface BuyerDiscoveryProvider {
  readonly id: BuyerDiscoveryProviderId;
  search(
    input: BuyerDiscoveryInput,
  ): Promise<ProviderResult<{ contacts: BuyerContact[]; totalCount: number }>>;
  enrichSelectedContact(email: string): Promise<ProviderResult<BuyerContact | null>>;
}
