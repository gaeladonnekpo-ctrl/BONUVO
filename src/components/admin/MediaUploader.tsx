"use client";

import Image from "next/image";
import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface UploadedMediaInfo {
  id: string;
  publicUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface MediaUploaderProps {
  label: string;
  hint: string;
  currentUrl?: string | null;
  onUploaded: (asset: UploadedMediaInfo) => void;
}

export function MediaUploader({ label, hint, currentUrl, onUploaded }: MediaUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null);
  const [altText, setAltText] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const previewUrl = uploadedUrl ?? currentUrl ?? null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setStatusMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", altText);

      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        asset?: UploadedMediaInfo;
        error?: { message?: string };
      };

      if (!response.ok || !payload.ok || !payload.asset) {
        setError(payload.error?.message ?? "Échec du téléversement.");
        return;
      }

      setUploadedUrl(payload.asset.publicUrl);
      setStatusMsg(
        `${payload.asset.mimeType} · ${payload.asset.width}×${payload.asset.height}px (${Math.round(
          payload.asset.sizeBytes / 1024,
        )} Ko)`,
      );
      onUploaded(payload.asset);
    } catch {
      setError("Erreur réseau lors du téléversement.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-card border border-border bg-surface-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-fg">{label}</p>
          <p className="text-xs text-fg-muted">{hint}</p>
        </div>
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={altText || label}
            width={64}
            height={64}
            className="h-12 w-12 rounded-md border border-border bg-surface object-contain p-1"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Texte alternatif (accessibilité)"
          className="max-w-xs"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="sr-only"
          aria-label={label}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {uploading ? "Traitement..." : "Téléverser un logo"}
        </Button>
      </div>

      {statusMsg ? <p className="text-xs text-success">{statusMsg}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
