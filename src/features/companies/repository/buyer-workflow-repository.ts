import { createServerClient } from "@/lib/db/supabase-server";

export type BuyerContactRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  company_id: string;
  provider_id: "mock" | "hunter" | "manual";
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  job_title: string | null;
  department: string | null;
  seniority: string | null;
  professional_profile_url: string | null;
  email_address: string | null;
  email_status: "unknown" | "found" | "verified" | "risky" | "invalid" | "not_found";
  email_confidence: number | null;
  fetched_at: string;
  verified_at: string | null;
};

async function db() {
  return createServerClient();
}

export async function getSavedCompanyContext(
  workspaceId: string,
  projectId: string,
  companyId: string,
) {
  const client = await db();
  const { data } = await client
    .from("project_companies" as never)
    .select("company_id, companies!inner(id, primary_domain, canonical_name)" as never)
    .eq("workspace_id" as never, workspaceId)
    .eq("project_id" as never, projectId)
    .eq("company_id" as never, companyId)
    .maybeSingle();
  if (!data) return null;
  const company = (
    data as unknown as {
      companies: { id: string; primary_domain: string | null; canonical_name: string };
    }
  ).companies;
  return company;
}

export async function upsertBuyerContacts(
  workspaceId: string,
  projectId: string,
  companyId: string,
  contacts: Array<Record<string, unknown>>,
) {
  const client = await db();
  for (const contact of contacts) {
    const providerId = String(contact.provider_id);
    const externalId = String(contact.provider_external_id);
    const { error } = await client.from("buyer_contacts" as never).upsert(
      {
        ...contact,
        workspace_id: workspaceId,
        project_id: projectId,
        company_id: companyId,
      } as never,
      {
        onConflict: "workspace_id,project_id,company_id,provider_id,provider_external_id",
      } as never,
    );
    if (error) throw new Error(`Buyer contact persistence failed (${providerId}:${externalId}).`);
  }
}

export async function listBuyerContacts(
  workspaceId: string,
  projectId: string,
  companyId: string,
): Promise<BuyerContactRow[]> {
  try {
    const client = await db();
    const { data, error } = await client
      .from("buyer_contacts" as never)
      .select("*" as never)
      .eq("workspace_id" as never, workspaceId)
      .eq("project_id" as never, projectId)
      .eq("company_id" as never, companyId)
      .order("created_at" as never, { ascending: true } as never);
    if (error) return [];
    return (data ?? []) as unknown as BuyerContactRow[];
  } catch {
    return [];
  }
}

export async function getBuyerContact(
  workspaceId: string,
  projectId: string,
  companyId: string,
  contactId: string,
): Promise<BuyerContactRow | null> {
  const client = await db();
  const { data } = await client
    .from("buyer_contacts" as never)
    .select("*" as never)
    .eq("workspace_id" as never, workspaceId)
    .eq("project_id" as never, projectId)
    .eq("company_id" as never, companyId)
    .eq("id" as never, contactId)
    .maybeSingle();
  return (data as unknown as BuyerContactRow) ?? null;
}

export async function updateBuyerEmail(
  workspaceId: string,
  contactId: string,
  data: Record<string, unknown>,
) {
  const client = await db();
  const result = await client
    .from("buyer_contacts" as never)
    .update(data as never)
    .eq("workspace_id" as never, workspaceId)
    .eq("id" as never, contactId);
  if (result.error) throw new Error("Buyer email could not be saved.");
}

export async function createOutreachLead(
  workspaceId: string,
  projectId: string,
  companyId: string,
  contactId: string,
  userId: string,
): Promise<"created" | "duplicate"> {
  const client = await db();
  const { error } = await client.from("outreach_leads" as never).insert({
    workspace_id: workspaceId,
    project_id: projectId,
    company_id: companyId,
    buyer_contact_id: contactId,
    created_by: userId,
    status: "draft",
  } as never);
  if (error?.code === "23505") return "duplicate";
  if (error) throw new Error("Outreach lead could not be created.");
  return "created";
}
