"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  description: string;
  expectedName: string;
  confirmLabel: string;
  cancelLabel?: string;
  inputLabel: string;
  onConfirm: (typedName: string) => Promise<{ ok: boolean; message?: string }>;
}

/**
 * Destructive confirmation dialog requiring the operator to type the entity name explicitly.
 */
export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  expectedName,
  confirmLabel,
  cancelLabel = "Annuler",
  inputLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === expectedName.trim().toLowerCase();

  async function handleConfirm() {
    if (!matches || pending) return;
    setPending(true);
    setError(null);
    const result = await onConfirm(typed.trim());
    setPending(false);
    if (result.ok) {
      setTyped("");
      setOpen(false);
    } else {
      setError(result.message ?? "Confirmation impossible.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="danger" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label className="block text-xs font-medium text-fg-muted">
            {inputLabel} : <strong className="text-fg">{expectedName}</strong>
          </label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expectedName}
            autoComplete="off"
          />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!matches || pending}
            onClick={handleConfirm}
          >
            {pending ? "..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
