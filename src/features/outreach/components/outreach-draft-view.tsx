"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutreachCopyButton } from "./outreach-copy-button";
import {
  editOutreachDraftAction,
  getOutreachDraftVersionsAction,
  restoreOutreachDraftVersionAction,
  transitionOutreachDraftAction,
} from "../api/outreach-actions";

interface OutreachDraftViewProps {
  draft: Record<string, unknown>;
  canReview?: boolean;
  onDraftChange?: (draft: Record<string, unknown>) => void;
}

export function OutreachDraftView({
  draft,
  canReview = false,
  onDraftChange,
}: OutreachDraftViewProps) {
  const channel = (draft.channel as string) || "email";
  const messageType = (draft.messageType as string) || "";
  const language = (draft.language as string) || "en";
  const subject = draft.subject as string | null;
  const body = (draft.body as string) || "";
  const callToAction = draft.callToAction as string | null;
  const tone = (draft.tone as string) || "";
  const length = (draft.length as string) || "";
  const confidence = draft.confidence as number | null;
  const personalization = draft.personalizationSummary as Record<string, unknown> | null;
  const evidence = (draft.evidenceUsed as string[]) || [];
  const assumptions = (draft.assumptions as string[]) || [];
  const warnings = (draft.warnings as string[]) || [];
  const missingInfo = (draft.missingInformation as string[]) || [];
  const noSubject = channel === "linkedin_connection";
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState(subject ?? "");
  const [editBody, setEditBody] = useState(body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, unknown>[] | null>(null);
  const status = String(draft.status ?? "draft");
  const version = Number(draft.version ?? draft.current_version_number ?? 1);
  const draftId = String(draft.id ?? "");

  async function refreshVersionHistory() {
    setBusy(true);
    setError(null);
    const result = await getOutreachDraftVersionsAction(draftId);
    setBusy(false);
    if (result.error) return setError(result.error);
    setVersions((result.versions ?? []) as Record<string, unknown>[]);
  }

  async function saveEdit() {
    setBusy(true);
    setError(null);
    const result = await editOutreachDraftAction({
      draftId,
      expectedVersion: version,
      subject: noSubject ? null : editSubject,
      body: editBody,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setEditing(false);
    onDraftChange?.({
      ...draft,
      ...(result.draft as unknown as Record<string, unknown>),
      messageType: draft.messageType,
      callToAction: draft.callToAction,
      version: version + 1,
    });
  }

  async function transition(transitionName: "approve" | "reject" | "reopen") {
    const reason =
      transitionName === "reject" ? window.prompt("Why is this draft being rejected?") : undefined;
    if (transitionName === "reject" && !reason) return;
    setBusy(true);
    setError(null);
    const result = await transitionOutreachDraftAction({
      draftId,
      expectedVersion: version,
      transition: transitionName,
      reason,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    onDraftChange?.({
      ...draft,
      status:
        transitionName === "approve"
          ? "approved"
          : transitionName === "reject"
            ? "rejected"
            : "draft",
      rejectionReason: reason ?? null,
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              <span>Generated Draft</span> · v{version}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" tone="info">
                {channel.replace("_", " ")}
              </Badge>
              <Badge variant="outline" tone="neutral">
                {messageType.replace("_", " ")}
              </Badge>
              <Badge variant="outline" tone="neutral">
                {language === "en" ? "English" : "Turkish"}
              </Badge>
              <Badge variant="outline" tone="neutral">
                {tone}
              </Badge>
              <Badge variant="outline" tone="neutral">
                {length}
              </Badge>
              <Badge
                variant="outline"
                tone={status === "approved" ? "success" : status === "rejected" ? "danger" : "info"}
              >
                {status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {editing ? (
            <div className="space-y-3">
              {!noSubject && (
                <div>
                  <label className="text-xs font-medium" htmlFor="outreach-subject">
                    Subject
                  </label>
                  <Input
                    id="outreach-subject"
                    value={editSubject}
                    maxLength={240}
                    onChange={(event) => setEditSubject(event.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium" htmlFor="outreach-body">
                  Body
                </label>
                <Textarea
                  id="outreach-body"
                  value={editBody}
                  maxLength={10000}
                  rows={10}
                  onChange={(event) => setEditBody(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={busy}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditSubject(subject ?? "");
                    setEditBody(body);
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Subject (email only) */}
              {!noSubject && subject && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Subject</p>
                  <div className="flex items-start justify-between gap-2 rounded-md bg-muted/50 p-3">
                    <p className="text-sm font-medium text-foreground">{subject}</p>
                    <OutreachCopyButton text={subject} label="Copy subject" />
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {channel === "linkedin_connection"
                    ? "Connection Message"
                    : noSubject
                      ? "Message"
                      : "Body"}
                </p>
                <div className="relative rounded-md bg-muted/50 p-4">
                  <div className="absolute right-3 top-3">
                    <OutreachCopyButton text={body} label="Copy body" />
                  </div>
                  <p className="whitespace-pre-wrap pr-10 text-sm leading-relaxed text-foreground">
                    {body}
                  </p>
                </div>
              </div>

              {/* CTA */}
              {callToAction && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Call to Action</p>
                  <div className="flex items-start justify-between gap-2 rounded-md bg-primary/5 p-3">
                    <p className="text-sm text-primary">{callToAction}</p>
                    <OutreachCopyButton text={callToAction} label="Copy CTA" />
                  </div>
                </div>
              )}

              {/* Full copy */}
              <div className="flex justify-end">
                <OutreachCopyButton
                  text={
                    noSubject
                      ? body
                      : subject
                        ? `Subject: ${subject}\n\n${body}${callToAction ? `\n\n${callToAction}` : ""}`
                        : `${body}${callToAction ? `\n\n${callToAction}` : ""}`
                  }
                  label="Copy full message"
                />
              </div>
            </>
          )}
          {!editing && (
            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => setEditing(true)} disabled={busy}>
                Edit
              </Button>
              <Button variant="outline" onClick={refreshVersionHistory} disabled={busy}>
                History
              </Button>
              {canReview && status === "draft" && (
                <>
                  <Button onClick={() => transition("approve")} disabled={busy}>
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => transition("reject")} disabled={busy}>
                    Reject
                  </Button>
                </>
              )}
              {status === "rejected" && (
                <Button variant="outline" onClick={() => transition("reopen")} disabled={busy}>
                  Revise draft
                </Button>
              )}
            </div>
          )}
          {versions && (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <h3 className="text-sm font-semibold">Version history</h3>
              {versions.map((item) => {
                const number = Number(item.version_number);
                return (
                  <div key={String(item.id)} className="rounded-md border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        Version {number}
                        {number === version ? " · Current" : ""}
                      </span>
                      {number !== version && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            const result = await restoreOutreachDraftVersionAction({
                              draftId,
                              expectedVersion: version,
                              versionNumber: number,
                            });
                            setBusy(false);
                            if (result.error) return setError(result.error);
                            onDraftChange?.({
                              ...draft,
                              ...(result.draft as unknown as Record<string, unknown>),
                              messageType: draft.messageType,
                              callToAction: draft.callToAction,
                              version: version + 1,
                            });
                            setVersions(null);
                          }}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                    {item.subject ? (
                      <p className="mt-2 text-xs font-medium">{String(item.subject)}</p>
                    ) : null}
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {String(item.body)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(String(item.created_at)).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      {confidence != null && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analysis Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-muted-foreground">Confidence: </span>
              <span
                className={`font-medium ${
                  confidence >= 70
                    ? "text-success"
                    : confidence >= 50
                      ? "text-accent"
                      : "text-warning"
                }`}
              >
                {confidence}%
              </span>
            </div>

            {personalization && (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">Personalization</p>
                <ul className="space-y-1 text-muted-foreground">
                  {personalization.companyContextUsed ? (
                    <li>Company: {String(personalization.companyContextUsed)}</li>
                  ) : null}
                  {personalization.roleContextUsed ? (
                    <li>Role: {String(personalization.roleContextUsed)}</li>
                  ) : null}
                  {personalization.painPointUsed ? (
                    <li>Pain point: {String(personalization.painPointUsed)}</li>
                  ) : null}
                  {personalization.outreachAngleUsed ? (
                    <li>Angle: {String(personalization.outreachAngleUsed)}</li>
                  ) : null}
                </ul>
              </div>
            )}

            {evidence.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">Evidence Used</p>
                <ul className="space-y-1 text-muted-foreground">
                  {evidence.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 block h-1 w-1 rounded-full bg-success" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {assumptions.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">Assumptions</p>
                <ul className="space-y-1 text-muted-foreground">
                  {assumptions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 block h-1 w-1 rounded-full bg-accent" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-medium text-warning">Warnings</p>
                <ul className="space-y-1 text-muted-foreground">
                  {warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 block h-1 w-1 rounded-full bg-warning" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {missingInfo.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-medium text-muted-foreground">Missing Information</p>
                <ul className="space-y-1 text-muted-foreground">
                  {missingInfo.map((m, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 block h-1 w-1 rounded-full bg-muted-foreground/40" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
