"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { OutreachGenerationForm } from "./outreach-generation-form";
import { OutreachProgressTracker } from "./outreach-progress-tracker";
import { OutreachDraftView } from "./outreach-draft-view";
import { OutreachEmptyState } from "./outreach-empty-state";
import { OutreachErrorState } from "./outreach-error-state";
import { OutreachUsageSummary } from "./outreach-usage-summary";
import {
  generateOutreachAction,
  getOutreachRunStatusAction,
  getOutreachDraftViewAction,
} from "../api/outreach-actions";
import { getApprovedRoles, getDefaultRole, type ApprovedRoleOption } from "./outreach-types";
import type { CompanyDecisionRoleRow } from "@/features/companies/repository/decision-role-repository";

interface OutreachSectionProps {
  roles: CompanyDecisionRoleRow[];
  projectSlug: string;
  countryCode: string;
  countryId: string;
  companyId: string;
  initialUsage: { used: number; limit: number; remaining: number };
  initialDraft: Record<string, unknown> | null;
  initialRun: {
    id: string;
    status: string;
    currentStage: string | null;
    safeErrorMessage: string | null;
  } | null;
}

export function OutreachSection({
  roles,
  projectSlug,
  countryCode,
  countryId,
  companyId,
  initialUsage,
  initialDraft,
  initialRun,
}: OutreachSectionProps) {
  const approvedRoles = getApprovedRoles(roles);
  const [selectedRole, setSelectedRole] = useState<ApprovedRoleOption | null>(() =>
    getDefaultRole(approvedRoles),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(initialRun?.status ?? null);
  const [currentStage, setCurrentStage] = useState<string | null>(initialRun?.currentStage ?? null);
  const [safeErrorMessage, setSafeErrorMessage] = useState<string | null>(
    initialRun?.safeErrorMessage ?? null,
  );
  const [draftResult, setDraftResult] = useState<Record<string, unknown> | null>(initialDraft);
  const [completedToast, setCompletedToast] = useState(false);
  const [idempotencyKey] = useState<string>(() => crypto.randomUUID());

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef(false);
  const succeededRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollingRef.current = false;
  }, []);

  const pollRun = useCallback(
    async (rid: string) => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      pollRef.current = setInterval(async () => {
        try {
          const res = await getOutreachRunStatusAction(projectSlug, countryCode, companyId, rid);
          if (res.error) {
            clearPolling();
            setError(res.error as string);
            setPending(false);
            return;
          }
          setRunStatus(res.status as string);
          setCurrentStage((res.currentStage as string) || null);
          setSafeErrorMessage((res.safeErrorMessage as string) || null);

          if (res.status === "failed" || res.status === "cancelled") {
            clearPolling();
            setPending(false);
          }

          if (res.status === "succeeded" && !succeededRef.current) {
            succeededRef.current = true;
            clearPolling();
            setPending(false);

            if (res.draftId) {
              const draftRes = await getOutreachDraftViewAction(res.draftId as string);
              if (draftRes?.success && draftRes.draft) {
                setDraftResult(draftRes.draft as Record<string, unknown>);
                setCompletedToast(true);
                setTimeout(() => setCompletedToast(false), 4000);
              }
            }
          }
        } catch {
          // Network error — keep polling
        }
      }, 3000);
    },
    [projectSlug, countryCode, companyId, clearPolling],
  );

  useEffect(() => {
    if (initialRun && (initialRun.status === "pending" || initialRun.status === "running")) {
      pollRun(initialRun.id);
    }
    return () => clearPolling();
  }, [clearPolling, initialRun, pollRun]);

  const handleSubmit = async (formData: Record<string, string>) => {
    setError(null);
    setPending(true);
    setDraftResult(null);
    setRunStatus(null);
    setCurrentStage(null);
    succeededRef.current = false;

    try {
      const fd = new FormData();
      fd.set("projectSlug", projectSlug);
      fd.set("countryId", countryId);
      fd.set("companyId", companyId);
      fd.set("decisionRoleId", formData.roleId ?? "");
      fd.set("channel", formData.channel ?? "");
      fd.set("messageType", formData.messageType ?? "");
      fd.set("language", formData.language ?? "");
      fd.set("objective", formData.objective ?? "");
      fd.set("tone", formData.tone ?? "professional");
      fd.set("length", formData.length ?? "medium");
      if (formData.instructions) fd.set("instructions", formData.instructions);
      fd.set("idempotencyKey", idempotencyKey);

      const result = await generateOutreachAction(fd);

      if (result?.error) {
        setError(result.error as string);
        setPending(false);
        return;
      }

      if (result?.success && result.runId) {
        const rid = result.runId as string;
        setRunStatus("pending");
        setCurrentStage("queued");
        pollRun(rid);
      }
    } catch {
      setError("Could not connect to the server. Check your connection.");
      setPending(false);
    }
  };

  const isRunning = runStatus === "pending" || runStatus === "running";
  const hasFailed = runStatus === "failed" || runStatus === "cancelled";

  if (approvedRoles.length === 0) {
    return (
      <OutreachEmptyState
        title="No approved decision-maker role is available yet."
        description="Approve a role in the Decision Maker Intelligence section above, then return to generate outreach."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Outreach Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Generate localized outreach drafts for approved decision-maker roles.
          </p>
        </div>
        <OutreachUsageSummary
          used={initialUsage.used}
          limit={initialUsage.limit}
          remaining={initialUsage.remaining}
        />
      </div>

      {completedToast && (
        <div className="rounded-md bg-success/10 px-4 py-2 text-sm text-success">
          Outreach draft generated successfully.
        </div>
      )}

      {error && !isRunning && <OutreachErrorState message={error} />}

      {draftResult ? (
        <OutreachDraftView draft={draftResult} />
      ) : isRunning ? (
        <OutreachProgressTracker
          currentStage={currentStage}
          status={runStatus}
          safeErrorMessage={safeErrorMessage}
        />
      ) : hasFailed ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">
              {safeErrorMessage || "Generation failed. You can try again."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <OutreachGenerationForm
          roles={approvedRoles}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          pending={pending}
          error={error ?? undefined}
          onSubmit={handleSubmit}
          usageExhausted={initialUsage.remaining <= 0}
        />
      )}
    </div>
  );
}
