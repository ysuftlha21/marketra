import { createHash, randomUUID } from "node:crypto";
import { parseServerEnv } from "@/lib/env/env";
import { createHunterClient } from "@/lib/providers/hunter/hunter-config";
import { authorizeHunterOperation } from "@/lib/providers/hunter/hunter-operation-policy";
import { enforceRateLimit } from "@/lib/security/rate-limit-service";
import { createBuyerDiscoveryProvider } from "@/lib/providers/buyer-discovery/buyer-discovery.factory";
import { createEmailEnrichmentProvider } from "@/lib/providers/email-enrichment/email-enrichment.factory";
import { HunterProviderError } from "@/lib/providers/hunter/hunter-client";
import {
  assertProviderAllowance,
  recordProviderOperation,
  type DiscoveryUsageOperation,
} from "./provider-usage-service";
import {
  createOutreachLead,
  getBuyerContact,
  getSavedCompanyContext,
  updateBuyerEmail,
  upsertBuyerContacts,
} from "../repository/buyer-workflow-repository";

export type BuyerWorkflowResult<T = undefined> =
  | { ok: true; data?: T; operationId: string }
  | { ok: false; error: string; errorReference: string; retryAfterSeconds?: number };

function safeFailure(error: unknown, operationId: string): BuyerWorkflowResult<never> {
  if (error instanceof HunterProviderError) {
    const messages = {
      authentication: "Hunter is not configured for this workspace.",
      authorization: "The Hunter plan does not allow this operation.",
      rate_limit: "Hunter rate limit reached. Please wait before trying again.",
      not_found: "No matching provider data was found.",
      invalid_request: "The provider could not process these filters.",
      provider_unavailable: "The discovery provider is temporarily unavailable.",
      invalid_response: "The provider returned an unexpected response.",
    };
    return {
      ok: false,
      error: messages[error.category],
      errorReference: `HUNTER-${operationId}`,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  const message =
    error instanceof Error && /limit|protection|not available/i.test(error.message)
      ? error.message
      : "The provider operation could not be completed.";
  return { ok: false, error: message, errorReference: `DISCOVERY-${operationId}` };
}

function identity(parts: Array<string | undefined>): string {
  return createHash("sha256").update(parts.filter(Boolean).join("|").toLowerCase()).digest("hex");
}

async function authorize(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  companyId: string;
  operation: "buyer_discovery" | "email_enrichment" | "email_verification";
}) {
  await authorizeHunterOperation({
    workspaceId: input.workspaceId,
    userId: input.userId,
    projectId: input.projectId,
    operation: input.operation,
    authorize: async () =>
      Boolean(await getSavedCompanyContext(input.workspaceId, input.projectId, input.companyId)),
  });
}

async function measured<T>(
  input: {
    workspaceId: string;
    projectId: string;
    operation: DiscoveryUsageOperation;
    providerId: string;
    operationId: string;
  },
  call: () => Promise<T>,
): Promise<T> {
  await assertProviderAllowance(input.workspaceId, input.operation);
  try {
    const result = await call();
    await recordProviderOperation({
      ...input,
      idempotencyKey: `${input.operationId}:${input.operation}`,
      success: true,
    });
    return result;
  } catch (error) {
    await recordProviderOperation({
      ...input,
      idempotencyKey: `${input.operationId}:${input.operation}`,
      success: false,
      errorCode: error instanceof HunterProviderError ? error.category : "controlled_failure",
    }).catch(() => undefined);
    throw error;
  }
}

export async function discoverBuyers(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  companyId: string;
  department?: string;
  seniority?: string;
  page: number;
  pageSize: number;
}): Promise<BuyerWorkflowResult<{ count: number }>> {
  const operationId = randomUUID();
  try {
    await authorize({ ...input, operation: "buyer_discovery" });
    const company = await getSavedCompanyContext(
      input.workspaceId,
      input.projectId,
      input.companyId,
    );
    if (!company?.primary_domain) throw new Error("A saved company domain is required.");
    const env = parseServerEnv();
    const providerId = env.DEFAULT_BUYER_DISCOVERY_PROVIDER;
    const hunterClient = providerId === "hunter" ? createHunterClient(env) : undefined;
    const result = await measured(
      {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        operation: "buyer_search",
        providerId,
        operationId,
      },
      () =>
        createBuyerDiscoveryProvider(providerId, { hunterClient }).search({
          domain: company.primary_domain!,
          department: input.department,
          seniority: input.seniority,
          limit: input.pageSize,
          offset: (input.page - 1) * input.pageSize,
        }),
    );
    const ranked = [...result.data.contacts].sort(
      (a, b) =>
        Number(b.seniority === "executive") - Number(a.seniority === "executive") ||
        Number(Boolean(b.department)) - Number(Boolean(a.department)),
    );
    await upsertBuyerContacts(
      input.workspaceId,
      input.projectId,
      input.companyId,
      ranked.map((contact) => ({
        provider_id: providerId,
        provider_external_id: identity([
          contact.fullName,
          contact.jobTitle,
          company.primary_domain ?? undefined,
        ]),
        first_name: contact.firstName ?? null,
        last_name: contact.lastName ?? null,
        full_name: contact.fullName ?? null,
        job_title: contact.jobTitle ?? null,
        department: contact.department ?? null,
        seniority: contact.seniority ?? null,
        professional_profile_url: contact.linkedinUrl ?? null,
        email_address: null,
        email_status: contact.emailAvailable ? "found" : "unknown",
        email_confidence: contact.emailConfidence ?? null,
        fetched_at: contact.fetchedAt,
      })),
    );
    return { ok: true, data: { count: ranked.length }, operationId };
  } catch (error) {
    return safeFailure(error, operationId);
  }
}

export async function revealBuyerEmail(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  companyId: string;
  contactId: string;
}): Promise<BuyerWorkflowResult<{ status: string; email?: string; cached: boolean }>> {
  const operationId = randomUUID();
  try {
    await authorize({ ...input, operation: "email_enrichment" });
    const [contact, company] = await Promise.all([
      getBuyerContact(input.workspaceId, input.projectId, input.companyId, input.contactId),
      getSavedCompanyContext(input.workspaceId, input.projectId, input.companyId),
    ]);
    if (!contact || !company?.primary_domain || !contact.first_name || !contact.last_name)
      throw new Error("This contact cannot be enriched.");
    if (
      contact.email_address &&
      contact.verified_at &&
      Date.now() - new Date(contact.verified_at).getTime() < 7 * 86400000
    )
      return {
        ok: true,
        data: { status: contact.email_status, email: contact.email_address, cached: true },
        operationId,
      };
    const env = parseServerEnv();
    const providerId = env.DEFAULT_EMAIL_ENRICHMENT_PROVIDER;
    const hunterClient = providerId === "hunter" ? createHunterClient(env) : undefined;
    const provider = createEmailEnrichmentProvider(providerId, { hunterClient });
    const found = await measured(
      {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        operation: "email_find",
        providerId,
        operationId,
      },
      () =>
        provider.findEmail({
          domain: company.primary_domain!,
          firstName: contact.first_name!,
          lastName: contact.last_name!,
        }),
    );
    if (!found.data.email) {
      await updateBuyerEmail(input.workspaceId, contact.id, {
        email_status: "not_found",
        email_address: null,
      });
      return { ok: true, data: { status: "not_found", cached: false }, operationId };
    }
    await authorize({ ...input, operation: "email_verification" });
    const verified = await measured(
      {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        operation: "email_verify",
        providerId,
        operationId,
      },
      () => provider.verifyEmail(found.data.email!),
    );
    const status =
      verified.data.status === "valid"
        ? "verified"
        : verified.data.status === "invalid" || verified.data.status === "disposable"
          ? "invalid"
          : verified.data.status === "accept_all"
            ? "risky"
            : "found";
    await updateBuyerEmail(input.workspaceId, contact.id, {
      email_address: found.data.email,
      email_status: status,
      email_confidence: verified.data.score ?? found.data.confidence ?? null,
      verified_at: new Date().toISOString(),
    });
    return {
      ok: true,
      data: { status, email: found.data.email, cached: verified.data.cached },
      operationId,
    };
  } catch (error) {
    return safeFailure(error, operationId);
  }
}

export async function handoffBuyerToOutreach(input: {
  workspaceId: string;
  userId: string;
  projectId: string;
  companyId: string;
  contactId: string;
}): Promise<BuyerWorkflowResult<{ state: "created" | "duplicate" }>> {
  const operationId = randomUUID();
  try {
    const company = await getSavedCompanyContext(
      input.workspaceId,
      input.projectId,
      input.companyId,
    );
    const contact = await getBuyerContact(
      input.workspaceId,
      input.projectId,
      input.companyId,
      input.contactId,
    );
    if (!company || !contact) throw new Error("The selected buyer is not available.");
    await enforceRateLimit({
      operation: "outreach_handoff",
      userId: input.userId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
    });
    const state = await createOutreachLead(
      input.workspaceId,
      input.projectId,
      input.companyId,
      input.contactId,
      input.userId,
    );
    return { ok: true, data: { state }, operationId };
  } catch (error) {
    return safeFailure(error, operationId);
  }
}
