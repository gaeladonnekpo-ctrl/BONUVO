import * as React from "react";

export interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">{title}</h1>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
