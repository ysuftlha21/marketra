"use client";

import { useEffect } from "react";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  startDecisionRoleGenerationAction,
  retryDecisionRoleGenerationAction,
} from "@/features/companies/api/decision-role-actions";
import { DecisionRoleCard } from "./decision-role-card";
import { DecisionRoleHistory } from "./decision-role-history";
import { DecisionRoleAddDialog } from "./decision-role-add-dialog";
import type {
  CompanyDecisionRoleRow,
  DecisionRoleRunRow,
} from "../repository/decision-role-repository";

interface DecisionRoleSectionProps {
  roles: CompanyDecisionRoleRow[];
  activeRun: DecisionRoleRunRow | null;
  runs: DecisionRoleRunRow[];
  projectId: string;
  projectSlug: string;
  countryId: string;
  companyId: string;
}

export function DecisionRoleSection({
  roles,
  activeRun,
  runs,
  projectId,
  projectSlug,
  countryId,
  companyId,
}: DecisionRoleSectionProps) {
  // Auto-refresh if a run is pending/running
  useEffect(() => {
    if (activeRun && (activeRun.status === "pending" || activeRun.status === "running")) {
      const interval = setInterval(() => {
        window.location.reload();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeRun]);

  const hasRoles = roles && roles.length > 0;
  const isRunning = activeRun?.status === "pending" || activeRun?.status === "running";
  const failedRun = activeRun?.status === "failed";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Decision Maker Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Identify the buying committee and discover how to approach them.
          </p>
        </div>

        {!hasRoles &&
          !isRunning &&
          (failedRun ? (
            <form
              action={async (fd) => {
                await retryDecisionRoleGenerationAction(fd);
                window.location.reload();
              }}
            >
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="countryId" value={countryId} />
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="runId" value={activeRun.id} />
              <Button type="submit" variant="default" className="gap-2">
                <Users className="h-4 w-4" /> Retry Discovery
              </Button>
            </form>
          ) : (
            <form
              action={async (fd) => {
                await startDecisionRoleGenerationAction(fd);
                window.location.reload();
              }}
            >
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="countryId" value={countryId} />
              <input type="hidden" name="companyId" value={companyId} />
              <Button type="submit" variant="default" className="gap-2">
                <Users className="h-4 w-4" /> Discover Decision Makers
              </Button>
            </form>
          ))}
      </div>

      {isRunning && (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
            <h3 className="text-lg font-medium">Analyzing buying committee...</h3>
            <p className="text-sm text-muted-foreground">
              {activeRun?.current_stage === "queued"
                ? "Queued for generation"
                : activeRun?.current_stage === "generating_roles"
                  ? "Evaluating matching roles"
                  : "Saving roles..."}
            </p>
          </CardContent>
        </Card>
      )}

      {failedRun && !isRunning && !hasRoles && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <h3 className="font-medium text-danger">Generation Failed</h3>
            <p className="text-sm text-danger/80">
              {activeRun?.safe_error_message || "An unexpected error occurred."}
            </p>
          </CardContent>
        </Card>
      )}

      {hasRoles && (
        <div className="flex justify-end gap-2 mb-4">
          <DecisionRoleHistory runs={runs} />
          {activeRun && (
            <DecisionRoleAddDialog
              projectId={projectId}
              projectSlug={projectSlug}
              companyId={companyId}
              sourceRunId={activeRun.id}
            />
          )}
        </div>
      )}

      {hasRoles && (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <DecisionRoleCard
              key={role.id}
              role={role}
              projectId={projectId}
              projectSlug={projectSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
