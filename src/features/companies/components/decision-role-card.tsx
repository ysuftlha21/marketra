"use client";

import { Check, X, Star } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateDecisionRoleStatusAction,
  setPrimaryRoleAction,
  setSecondaryRoleAction,
} from "@/features/companies/api/decision-role-actions";
import { cn } from "@/lib/utils/cn";
import { DecisionRoleEditDialog } from "./decision-role-edit-dialog";
import type { CompanyDecisionRoleRow } from "../repository/decision-role-repository";

interface DecisionRoleCardProps {
  role: CompanyDecisionRoleRow;
  projectId: string;
  projectSlug: string;
}

export function DecisionRoleCard({ role, projectId, projectSlug }: DecisionRoleCardProps) {
  const isArchived = role.status === "archived";
  const isRejected = role.status === "rejected";

  return (
    <Card
      className={cn(
        "border-border/60 transition-all",
        isArchived || isRejected ? "opacity-60 grayscale-[0.5]" : "",
        role.is_primary ? "border-primary/50 bg-primary/5 shadow-sm" : "",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              {role.role_title}
              {role.is_primary && (
                <Badge variant="solid" className="gap-1 px-1.5 py-0">
                  <Star className="h-3 w-3 fill-current" />
                  Primary
                </Badge>
              )}
              {role.is_secondary && (
                <Badge variant="outline" className="gap-1 px-1.5 py-0">
                  <Star className="h-3 w-3 text-muted-foreground" />
                  Secondary
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className="font-medium text-foreground">{role.department}</span>
              <span className="text-muted-foreground">•</span>
              <span className="capitalize text-muted-foreground">
                {role.buying_role.replace("_", " ")}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Match</span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  role.fit_score >= 80
                    ? "text-success"
                    : role.fit_score >= 50
                      ? "text-accent"
                      : "text-warning",
                )}
              >
                {role.fit_score}
              </span>
            </div>
            {role.status !== "suggested" && (
              <Badge variant="outline" className="capitalize">
                {role.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{role.reasoning}</p>

        {(role.likely_pain_points as string[])?.length > 0 && (
          <div className="space-y-1">
            <h4 className="font-medium text-foreground">Pain Points</h4>
            <ul className="list-disc pl-4 text-muted-foreground">
              {(role.likely_pain_points as string[]).map((pain, i) => (
                <li key={i}>{pain}</li>
              ))}
            </ul>
          </div>
        )}

        {(role.recommended_message_angles as string[])?.length > 0 && (
          <div className="space-y-1">
            <h4 className="font-medium text-foreground">Outreach Angle</h4>
            <ul className="list-disc pl-4 text-muted-foreground">
              {(role.recommended_message_angles as string[]).map((angle, i) => (
                <li key={i}>{angle}</li>
              ))}
            </ul>
          </div>
        )}

        {role.user_notes && (
          <div className="space-y-1">
            <h4 className="font-medium text-foreground">User Notes</h4>
            <p className="text-muted-foreground">{role.user_notes}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        {role.status === "suggested" && (
          <>
            <form
              action={async (fd) => {
                await updateDecisionRoleStatusAction(fd);
              }}
            >
              <input type="hidden" name="roleId" value={role.id} />
              <input type="hidden" name="companyId" value={role.company_id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="status" value="approved" />
              <Button size="sm" variant="outline" className="gap-1">
                <Check className="h-4 w-4" /> Approve
              </Button>
            </form>
            <form
              action={async (fd) => {
                await updateDecisionRoleStatusAction(fd);
              }}
            >
              <input type="hidden" name="roleId" value={role.id} />
              <input type="hidden" name="companyId" value={role.company_id} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="status" value="rejected" />
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-danger hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </form>
          </>
        )}

        {role.status === "approved" && !role.is_primary && (
          <form
            action={async (fd) => {
              await setPrimaryRoleAction(fd);
            }}
          >
            <input type="hidden" name="roleId" value={role.id} />
            <input type="hidden" name="companyId" value={role.company_id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="value" value="true" />
            <Button size="sm" variant="outline" className="gap-1">
              <Star className="h-4 w-4" /> Set Primary
            </Button>
          </form>
        )}

        {role.status === "approved" && !role.is_secondary && !role.is_primary && (
          <form
            action={async (fd) => {
              await setSecondaryRoleAction(fd);
            }}
          >
            <input type="hidden" name="roleId" value={role.id} />
            <input type="hidden" name="companyId" value={role.company_id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="value" value="true" />
            <Button size="sm" variant="outline" className="gap-1">
              Set Secondary
            </Button>
          </form>
        )}

        {role.status !== "archived" && (
          <DecisionRoleEditDialog
            role={role}
            projectId={projectId}
            projectSlug={projectSlug}
            trigger={
              <Button size="sm" variant="outline">
                Edit
              </Button>
            }
          />
        )}
      </CardFooter>
    </Card>
  );
}
