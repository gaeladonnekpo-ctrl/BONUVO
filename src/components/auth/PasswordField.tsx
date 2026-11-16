"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { validateStrongPassword } from "@/modules/auth/schema";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
  showStrengthHint?: boolean;
  describedBy?: string;
}

export function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
  showStrengthHint = false,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const t = useTranslations("auth.fields");
  const hintId = `${id}-hint`;
  const strongOk = value.length > 0 && validateStrongPassword(value) === null;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={
            showStrengthHint ? `${hintId} ${describedBy ?? ""}`.trim() : describedBy
          }
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          aria-pressed={visible}
          className="absolute top-1/2 right-1.5 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-elevated hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {showStrengthHint ? (
        <p id={hintId} className={cn("text-xs", strongOk ? "text-trust" : "text-fg-muted")}>
          {strongOk ? t("passwordStrengthOk") : t("passwordHint")}
        </p>
      ) : null}
    </div>
  );
}
