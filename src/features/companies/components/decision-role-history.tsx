"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DecisionRoleRunRow } from "../repository/decision-role-repository";

interface DecisionRoleHistoryProps {
  runs: DecisionRoleRunRow[];
}

export function DecisionRoleHistory({ runs }: DecisionRoleHistoryProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="h-4 w-4" /> History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Generation History</SheetTitle>
        </SheetHeader>

        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past runs found.</p>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <div key={run.id} className="rounded-md border p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{new Date(run.created_at).toLocaleString()}</span>
                  <Badge variant="outline" className="capitalize">
                    {run.status}
                  </Badge>
                </div>
                {run.status === "failed" && run.safe_error_message && (
                  <p className="text-danger mt-1 text-xs">{run.safe_error_message}</p>
                )}
                {run.status === "succeeded" && (
                  <p className="text-muted-foreground text-xs mt-1">Completed successfully.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
