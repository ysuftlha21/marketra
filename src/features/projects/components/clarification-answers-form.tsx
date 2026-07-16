"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClarificationQuestion } from "@/lib/providers/ai/ai.provider";

export interface ClarificationAnswersFormProps {
  questions: ClarificationQuestion[];
  savedAnswers: Record<string, string>;
}

export function ClarificationAnswersForm({
  questions,
  savedAnswers,
}: ClarificationAnswersFormProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  // Normalize legacy V1 questions (array of strings) into the required object format
  const normalizedQuestions: ClarificationQuestion[] = questions.map((q, i) => {
    if (typeof q === "string") {
      return {
        key: `legacy_${i}`,
        question: q as string,
        category: "General",
        isRequired: false,
      };
    }
    return q;
  });

  const answeredCount = normalizedQuestions.filter((q) => !!savedAnswers[q.key]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Clarification Questions</h3>
          <p className="text-sm text-muted-foreground">
            The AI analysis identified missing information. Answer these questions to improve the
            next run.
          </p>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {answeredCount} / {questions.length} answered
        </div>
      </div>

      <div className="grid gap-6">
        {normalizedQuestions.map((q) => {
          const answerValue = savedAnswers[q.key] || "";
          return (
            <div key={q.key} className="space-y-2 rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {q.category}
                </span>
                {q.isRequired && (
                  <span className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    * Required
                  </span>
                )}
              </div>
              <Label htmlFor={`answer_${q.key}`} className="text-base font-medium">
                {q.question}
              </Label>
              <input type="hidden" name="questionKey" value={q.key} />
              <input type="hidden" name={`questionText_${q.key}`} value={q.question} />
              <Textarea
                id={`answer_${q.key}`}
                name={`answer_${q.key}`}
                defaultValue={answerValue}
                placeholder="Your answer..."
                className="mt-2 min-h-[100px]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
