"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OutreachRoleSelector } from "./outreach-role-selector";
import { OutreachChannelField } from "./outreach-channel-field";
import { OutreachMessageTypeField } from "./outreach-message-type-field";
import {
  OUTREACH_TONES,
  OUTREACH_LENGTHS,
  OUTREACH_LANGUAGES,
  getValidMessageTypes,
  getDefaultMessageType,
  type ApprovedRoleOption,
} from "./outreach-types";

interface OutreachGenerationFormProps {
  roles: ApprovedRoleOption[];
  selectedRole: ApprovedRoleOption | null;
  onRoleChange: (role: ApprovedRoleOption) => void;
  pending: boolean;
  error?: string;
  onSubmit: (data: Record<string, string>) => void;
  usageExhausted: boolean;
}

export function OutreachGenerationForm({
  roles,
  selectedRole,
  onRoleChange,
  pending,
  error,
  onSubmit,
  usageExhausted,
}: OutreachGenerationFormProps) {
  const [channel, setChannel] = useState("email");
  const [messageType, setMessageType] = useState("initial_contact");
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [objective, setObjective] = useState("");
  const [instructions, setInstructions] = useState("");

  const validTypes = getValidMessageTypes(channel);
  const canSubmit =
    !!selectedRole &&
    !pending &&
    !usageExhausted &&
    objective.trim().length >= 10 &&
    objective.trim().length <= 500;

  const handleChannelChange = (value: string) => {
    setChannel(value);

    // Changing channel resets an incompatible message type
    const newValidTypes = getValidMessageTypes(value);
    if (!newValidTypes.includes(messageType)) {
      setMessageType(getDefaultMessageType(value));
    }

    // LinkedIn connection forces supported short length
    if (value === "linkedin_connection") {
      setLength("short");
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedRole) return;
    onSubmit({
      roleId: selectedRole.id,
      channel,
      messageType,
      language,
      tone,
      length,
      objective: objective.trim(),
      instructions: instructions.trim() || "",
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Generate Outreach Draft</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <OutreachRoleSelector roles={roles} selectedRole={selectedRole} onChange={onRoleChange} />

        <div className="grid gap-4 sm:grid-cols-2">
          <OutreachChannelField value={channel} onChange={handleChannelChange} />
          <OutreachMessageTypeField
            value={messageType}
            onChange={setMessageType}
            validTypes={validTypes}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="og-language">Language</Label>
            <select
              id="og-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {OUTREACH_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="og-tone">Tone</Label>
            <select
              id="og-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {OUTREACH_TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="og-length">Length</Label>
            <select
              id="og-length"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              disabled={channel === "linkedin_connection"}
              className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {OUTREACH_LENGTHS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="og-objective">
            Outreach Objective <span className="text-danger">*</span>
          </Label>
          <Input
            id="og-objective"
            placeholder="e.g. Introduce the product and request a short meeting"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            {objective.length}/500 characters (min. 10)
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="og-instructions">Additional Instructions (optional)</Label>
          <Textarea
            id="og-instructions"
            rows={2}
            placeholder="e.g. Emphasize the time-saving benefits for technical teams"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">{instructions.length}/1000</p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting generation…
            </>
          ) : usageExhausted ? (
            "Outreach limit reached"
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Generate outreach draft
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
