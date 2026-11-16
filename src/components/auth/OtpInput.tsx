"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  length?: number;
}

export function OtpInput({ value, onChange, disabled = false, length = 6 }: OtpInputProps) {
  const t = useTranslations("auth.fields");
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, idx) => value[idx] ?? "");

  function updateAt(index: number, char: string) {
    const clean = char.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    if (clean.length > 1) {
      const merged = clean.slice(0, length);
      onChange(merged);
      const focusIdx = Math.min(length - 1, merged.length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    onChange(next.join(""));
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      onChange(next.join(""));
      inputRefs.current[index - 1]?.focus();
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(length - 1, pasted.length - 1)]?.focus();
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-fg">{t("otpLegend")}</legend>
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={length}
            disabled={disabled}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={t("otpDigitLabel", { index: index + 1 })}
            value={digit}
            onChange={(event) => updateAt(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            className={cn(
              "h-11 w-10 rounded-lg border border-border bg-surface-subtle text-center font-mono text-lg font-semibold text-fg transition-colors sm:w-12",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
