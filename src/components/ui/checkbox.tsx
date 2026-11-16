import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, id, label, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-fg select-none"
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "h-4.5 w-4.5 rounded border border-border-strong bg-surface-subtle accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        {label ? <span>{label}</span> : null}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
