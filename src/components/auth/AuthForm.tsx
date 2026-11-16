"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AuthFormStatus {
  kind: "error" | "success";
  message: string;
}

export interface AuthFormProps {
  title: string;
  description: string;
  status?: AuthFormStatus | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthForm({
  title,
  description,
  status,
  onSubmit,
  children,
  footer,
  className,
}: AuthFormProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-10 sm:py-14">
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="font-display text-xl sm:text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {status ? (
            <div
              role="alert"
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
                status.kind === "error"
                  ? "border-danger/40 bg-danger-soft text-danger"
                  : "border-trust/40 bg-trust-soft text-trust",
              )}
            >
              {status.kind === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{status.message}</span>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {children}
          </form>

          {footer ? (
            <div className="border-t border-border pt-4 text-sm text-fg-muted">{footer}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
