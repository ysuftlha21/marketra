import { z } from "zod";
import { normalizeDomain } from "@/features/companies/domain/company-normalization";
import { buildMeta } from "../provider-types";
import {
  buyerContactSchema,
  type BuyerContact,
  type BuyerDiscoveryInput,
  type BuyerDiscoveryProvider,
} from "../buyer-discovery/buyer-discovery.provider";
import type { HunterClient } from "./hunter-client";

const personSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    position: z.string().optional(),
    seniority: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email().optional(),
    confidence: z.number().optional(),
    linkedin: z.string().url().optional(),
  })
  .passthrough();
const domainSearchSchema = z
  .object({
    data: z
      .object({
        emails: z.array(personSchema).default([]),
        meta: z.object({ results: z.number().int().nonnegative().optional() }).optional(),
      })
      .passthrough(),
  })
  .passthrough();
const personResponseSchema = z.object({ data: personSchema.nullable() }).passthrough();

function normalizePerson(person: z.infer<typeof personSchema>): BuyerContact {
  return buyerContactSchema.parse({
    firstName: person.first_name,
    lastName: person.last_name,
    fullName:
      person.full_name ??
      ([person.first_name, person.last_name].filter(Boolean).join(" ") || undefined),
    jobTitle: person.position,
    seniority: person.seniority,
    department: person.department,
    email: person.email,
    emailAvailable: Boolean(person.email),
    emailConfidence: person.confidence,
    linkedinUrl: person.linkedin,
    source: "hunter",
    fetchedAt: new Date().toISOString(),
  });
}

export class HunterBuyerDiscoveryProvider implements BuyerDiscoveryProvider {
  readonly id = "hunter" as const;
  constructor(private readonly client: HunterClient) {}
  async search(input: BuyerDiscoveryInput) {
    const startedAt = Date.now();
    const domain = normalizeDomain(input.domain);
    if (!domain) throw new Error("A valid company domain is required.");
    const response = domainSearchSchema.parse(
      await this.client.request<unknown>("buyer_domain_search", "/domain-search", {
        query: {
          domain,
          department: input.department,
          seniority: input.seniority,
          limit: Math.min(input.limit ?? 10, 100),
          offset: input.offset ?? 0,
        },
      }),
    );
    return {
      data: {
        contacts: response.data.emails.map(normalizePerson),
        totalCount: response.data.meta?.results ?? response.data.emails.length,
      },
      meta: buildMeta("hunter-buyer-discovery", false, startedAt),
    };
  }
  async enrichSelectedContact(email: string) {
    const startedAt = Date.now();
    const response = personResponseSchema.parse(
      await this.client.request<unknown>("person_enrichment", "/people/find", { query: { email } }),
    );
    return {
      data: response.data ? normalizePerson(response.data) : null,
      meta: buildMeta("hunter-person-enrichment", false, startedAt),
    };
  }
}
