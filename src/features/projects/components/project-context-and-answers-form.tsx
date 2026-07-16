"use client";

import { useTransition } from "react";
import { ProjectAdditionalContextForm } from "./project-additional-context-form";
import { ClarificationAnswersForm } from "./clarification-answers-form";
import { Button } from "@/components/ui/button";
import { saveProjectContextAndAnswersAction } from "../api/project-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ClarificationQuestion } from "@/lib/providers/ai/ai.provider";

export interface ProjectContextAndAnswersFormProps {
  projectSlug: string;
  runId: string | null;
  initialAdditionalContext: Record<string, unknown> | null;
  clarificationQuestions: ClarificationQuestion[] | null;
  savedAnswers: Record<string, string>;
}

export function ProjectContextAndAnswersForm({
  projectSlug,
  runId,
  initialAdditionalContext,
  clarificationQuestions,
  savedAnswers,
}: ProjectContextAndAnswersFormProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const additionalContext = {
      priorityRegions: formData.get("priorityRegions"),
      countryDataCoverage: formData.get("countryDataCoverage"),
      crmIntegrations: formData.get("crmIntegrations"),
      customerEvidence: formData.get("customerEvidence"),
      knownCompetitors: formData.get("knownCompetitors"),
      technologyStack: formData.get("technologyStack"),
      additionalNotes: formData.get("additionalNotes"),
    };

    const answers: { questionKey: string; questionText: string; answer: string }[] = [];
    if (clarificationQuestions) {
      for (const q of clarificationQuestions) {
        const val = formData.get(`answer_${q.key}`) as string;
        if (val) {
          answers.push({
            questionKey: q.key,
            questionText: q.question,
            answer: val,
          });
        }
      }
    }

    startTransition(async () => {
      await saveProjectContextAndAnswersAction(projectSlug, runId, {
        additionalContext,
        clarificationAnswers: answers,
      });
    });
  }

  const hasQuestions = clarificationQuestions && clarificationQuestions.length > 0;

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <ProjectAdditionalContextForm initialData={initialAdditionalContext} />
        </CardContent>
      </Card>

      {hasQuestions && (
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <ClarificationAnswersForm
              questions={clarificationQuestions}
              savedAnswers={savedAnswers}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Context & Answers
        </Button>
      </div>
    </form>
  );
}
