"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { EntityForm } from "@/components/admin/EntityForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { updateSettingAction } from "@/modules/admin/actions";

export interface SettingItem {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string;
}

export function SettingsView({
  settings,
  canManage,
}: {
  settings: SettingItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [key, setKey] = React.useState(settings[0]?.key ?? "catalog.freshness_warning_days");
  const [valueJson, setValueJson] = React.useState(
    JSON.stringify(settings[0]?.value ?? { days: 30 }, null, 2),
  );
  const [description, setDescription] = React.useState(settings[0]?.description ?? "");
  const [result, setResult] = React.useState<AdminActionResult | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="font-mono text-sm">{item.key}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-fg-muted">{item.description}</p>
              <pre className="overflow-x-auto rounded bg-surface-subtle p-2 text-xs text-fg">
                {JSON.stringify(item.value, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage ? (
        <EntityForm
          title="Modifier un paramètre système"
          submitLabel="Mettre à jour"
          result={result}
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await updateSettingAction({ key, valueJson, description });
            setResult(res);
            if (res.ok) router.refresh();
          }}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="st-key" className="text-xs font-semibold text-fg">
                Clé
              </label>
              <Input id="st-key" value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="st-val" className="text-xs font-semibold text-fg">
                Valeur JSON (objet)
              </label>
              <textarea
                id="st-val"
                rows={4}
                value={valueJson}
                onChange={(e) => setValueJson(e.target.value)}
                className="w-full rounded-input border border-border bg-surface p-2 font-mono text-xs text-fg"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="st-desc" className="text-xs font-semibold text-fg">
                Description
              </label>
              <Input
                id="st-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </EntityForm>
      ) : null}
    </div>
  );
}
