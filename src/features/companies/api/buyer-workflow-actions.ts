"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import {
  buyerSearchSchema,
  outreachLeadSchema,
  revealEmailSchema,
} from "../schema/hunter-workflow-schema";
import {
  discoverBuyers,
  handoffBuyerToOutreach,
  revealBuyerEmail,
} from "../services/buyer-workflow-service";

function authFailure() {
  return { ok: false as const, error: "Sign in to continue.", errorReference: "AUTH-REQUIRED" };
}

export async function discoverBuyersAction(input: unknown) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return authFailure();
  const parsed = buyerSearchSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Enter valid buyer search filters.",
      errorReference: "BUYER-INPUT",
    };
  const result = await discoverBuyers({
    ...parsed.data,
    workspaceId: ctx.activeWorkspace.workspace.id,
    userId: ctx.user.id,
  });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function revealBuyerEmailAction(input: unknown) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return authFailure();
  const parsed = revealEmailSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Email reveal requires explicit confirmation.",
      errorReference: "EMAIL-CONFIRM",
    };
  const result = await revealBuyerEmail({
    ...parsed.data,
    workspaceId: ctx.activeWorkspace.workspace.id,
    userId: ctx.user.id,
  });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function handoffBuyerToOutreachAction(input: unknown) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return authFailure();
  const parsed = outreachLeadSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Select a valid saved buyer.",
      errorReference: "OUTREACH-INPUT",
    };
  const result = await handoffBuyerToOutreach({
    ...parsed.data,
    workspaceId: ctx.activeWorkspace.workspace.id,
    userId: ctx.user.id,
  });
  if (result.ok) revalidatePath("/dashboard/outreach");
  return result;
}
