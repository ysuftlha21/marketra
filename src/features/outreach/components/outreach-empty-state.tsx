"use client";

import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OutreachEmptyStateProps {
  title: string;
  description: string;
}

export function OutreachEmptyState({ title, description }: OutreachEmptyStateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Outreach Intelligence</h2>
        <p className="text-sm text-muted-foreground">
          Generate localized outreach drafts for approved decision-maker roles.
        </p>
      </div>
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-6 w-6 text-muted-foreground" />
          </span>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="max-w-sm text-center text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
