import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  id?: string;
  className?: string;
}

export function SectionHeader({ title, description, actions, id, className }: SectionHeaderProps) {
  return (
    <div
      id={id}
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
