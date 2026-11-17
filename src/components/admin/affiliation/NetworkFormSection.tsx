"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { EntityForm } from "@/components/admin/EntityForm";
import { Input } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { upsertAffiliateNetworkAction } from "@/modules/offers/actions";

export function NetworkFormSection({ networksCount }: { networksCount: number }) {
  const router = useRouter();
  const [netName, setNetName] = React.useState("");
  const [netSlug, setNetSlug] = React.useState("");
  const [adapterKey, setAdapterKey] = React.useState<"1xpartners" | "1win" | "generic">(
    "1xpartners",
  );
  const [trackingMode, setTrackingMode] = React.useState<
    "postback" | "webhook" | "import" | "none"
  >("postback");
  const [signatureMode, setSignatureMode] = React.useState<"token" | "hmac_sha256" | "none">(
    "token",
  );
  const [subIdParam, setSubIdParam] = React.useState("subid");
  const [secretEnvRef, setSecretEnvRef] = React.useState("");
  const [netResult, setNetResult] = React.useState<AdminActionResult<unknown> | null>(null);

  return (
    <EntityForm
      title={`Réseaux d'affiliation (${networksCount})`}
      description="Référence de variable d'environnement uniquement (jamais de secret brut en base)."
      submitLabel="Ajouter le réseau"
      result={netResult}
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await upsertAffiliateNetworkAction({
          name: netName,
          slug: netSlug || undefined,
          adapterKey,
          trackingMode,
          signatureMode,
          subIdParamName: subIdParam,
          secretEnvRef,
          status: "active",
        });
        setNetResult(res);
        if (res.ok) {
          setNetName("");
          setNetSlug("");
          setSecretEnvRef("");
          router.refresh();
        }
      }}
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Nom du réseau"
            required
            value={netName}
            onChange={(e) => setNetName(e.target.value)}
          />
          <Input
            placeholder="Slug URL (ex. 1xpartners)"
            value={netSlug}
            onChange={(e) => setNetSlug(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="Adaptateur partenaire"
            value={adapterKey}
            onChange={(e) => setAdapterKey(e.target.value as typeof adapterKey)}
            className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
          >
            <option value="1xpartners">1xPartners / BetB2B</option>
            <option value="1win">1win Partners</option>
            <option value="generic">Générique S2S</option>
          </select>
          <select
            aria-label="Mode de suivi"
            value={trackingMode}
            onChange={(e) => setTrackingMode(e.target.value as typeof trackingMode)}
            className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
          >
            <option value="postback">postback</option>
            <option value="webhook">webhook</option>
            <option value="import">import</option>
            <option value="none">none</option>
          </select>
          <select
            aria-label="Mode de signature"
            value={signatureMode}
            onChange={(e) => setSignatureMode(e.target.value as typeof signatureMode)}
            className="h-10 rounded-input border border-border bg-surface px-2 text-sm text-fg"
          >
            <option value="token">token</option>
            <option value="hmac_sha256">hmac_sha256</option>
            <option value="none">none</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Paramètre subid"
            value={subIdParam}
            onChange={(e) => setSubIdParam(e.target.value)}
          />
          <Input
            placeholder="Variable env (ex. AFFILIATE_1XPARTNERS_SECRET)"
            value={secretEnvRef}
            onChange={(e) => setSecretEnvRef(e.target.value)}
          />
        </div>
      </div>
    </EntityForm>
  );
}
