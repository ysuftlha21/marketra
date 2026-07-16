"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutreachCopyButton } from "./outreach-copy-button";

interface OutreachDraftViewProps {
  draft: Record<string, unknown>;
}

export function OutreachDraftView({ draft }: OutreachDraftViewProps) {
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

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Generated Draft</CardTitle>
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
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
