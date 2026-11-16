"use client";

import * as React from "react";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface EntityFormProps {
  title: string;
  description?: string;
  submitLabel: string;
  isSubmitting?: boolean;
  result?: AdminActionResult<unknown> | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
}

export function EntityForm({
  title,
  description,
  submitLabel,
  isSubmitting = false,
  result = null,
  onSubmit,
  children,
  footerExtra,
}: EntityFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {result ? (
            <div
              role="status"
              className={
                result.ok
                  ? "rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-sm text-fg"
                  : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
              }
            >
              {result.message}
            </div>
          ) : null}

          {children}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div>{footerExtra}</div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
