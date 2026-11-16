"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandMark } from "@/components/brand/BrandMark";
import { CommunityFab } from "@/components/business/CommunityFab";
import { OfferCard } from "@/components/business/OfferCard";
import { PartnerLogoGrid } from "@/components/business/PartnerLogoGrid";
import { PromoCodeBox } from "@/components/business/PromoCodeBox";
import { RatingScore } from "@/components/business/RatingScore";
import type { DataComponentState } from "@/components/business/types";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UiBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEV_SAMPLE_CHANNELS, DEV_SAMPLE_OFFER, DEV_SAMPLE_PARTNERS } from "./dev-samples";

const STATE_OPTIONS: readonly DataComponentState[] = ["content", "loading", "empty", "error"];

export function DesignShowcaseClient() {
  const t = useTranslations("designShowcase");
  const tStates = useTranslations("states");
  const [selectedState, setSelectedState] = React.useState<DataComponentState>("content");
  const [switchChecked, setSwitchChecked] = React.useState(true);
  const [checkboxChecked, setCheckboxChecked] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const { pushToast } = useToast();

  return (
    <div className="space-y-8">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/40 bg-warning-soft px-4 py-3 text-xs font-semibold text-warning sm:text-sm"
      >
        <span>{t("devBanner")}</span>
        <UiBadge tone="warning">{t("sampleBadge")}</UiBadge>
      </div>

      <header className="space-y-2">
        <Breadcrumb
          items={[{ label: "BONUVO", href: "/" }, { label: "Admin" }, { label: t("sampleBadge") }]}
        />
        <h1 className="font-display text-2xl font-bold text-fg sm:text-3xl">{t("title")}</h1>
        <p className="max-w-3xl text-sm text-fg-muted">{t("subtitle")}</p>
      </header>

      <Card id="dashboard">
        <CardHeader>
          <CardTitle>{t("shellsHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-bg p-5">
            <BrandLogo size="lg" showTagline />
            <BrandMark variant="badge" size={56} aria-label="BONUVO app icon" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CountrySwitcher />
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card id="catalog">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("statesHeading")}</CardTitle>
          <Tabs
            value={selectedState}
            onValueChange={(value) => setSelectedState(value as DataComponentState)}
          >
            <TabsList>
              {STATE_OPTIONS.map((state) => (
                <TabsTrigger key={state} value={state}>
                  {state}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={selectedState} className="sr-only">
              {selectedState}
            </TabsContent>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-6">
          <OfferCard
            offer={selectedState === "content" ? DEV_SAMPLE_OFFER : null}
            state={selectedState}
            onRetry={() => setSelectedState("content")}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PromoCodeBox
              code={selectedState === "content" ? DEV_SAMPLE_OFFER.promoCode : null}
              validOn={DEV_SAMPLE_OFFER.promoValidOn}
              state={selectedState}
              onRetry={() => setSelectedState("content")}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-subtle p-4">
              <RatingScore
                score={selectedState === "content" ? 4.5 : null}
                state={selectedState}
                onRetry={() => setSelectedState("content")}
              />
              <CommunityFab
                mode="inline"
                channels={selectedState === "content" ? DEV_SAMPLE_CHANNELS : []}
                state={selectedState}
                onRetry={() => setSelectedState("content")}
              />
            </div>
          </div>

          <PartnerLogoGrid
            items={selectedState === "content" ? DEV_SAMPLE_PARTNERS : []}
            state={selectedState}
            onRetry={() => setSelectedState("content")}
          />
        </CardContent>
      </Card>

      <Card id="affiliation">
        <CardHeader>
          <CardTitle>{t("primitivesHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary">Primary CTA</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="trust">Trust</Button>
            <Button variant="danger">Danger</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <UiBadge tone="neutral">Neutral</UiBadge>
            <UiBadge tone="accent">Accent</UiBadge>
            <UiBadge tone="trust">Trust Verified</UiBadge>
            <UiBadge tone="warning">Warning</UiBadge>
            <UiBadge tone="danger">Danger</UiBadge>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input aria-label="Sample input" placeholder="Exemple de champ texte" />
            <div className="flex items-center gap-3">
              <Switch
                aria-label="Sample switch"
                checked={switchChecked}
                onCheckedChange={setSwitchChecked}
              />
              <span className="text-sm text-fg-muted">{switchChecked ? "Actif" : "Inactif"}</span>
            </div>
            <Checkbox
              label="Option (exemple de développement)"
              checked={checkboxChecked}
              onChange={(event) => setCheckboxChecked(event.target.checked)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                pushToast({
                  title: t("sampleBadge"),
                  description: t("triggerToast"),
                  tone: "trust",
                })
              }
            >
              {t("triggerToast")}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Dialog
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("sampleBadge")}</DialogTitle>
                  <DialogDescription>{t("devBanner")}</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Tooltip
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("sampleBadge")}</TooltipContent>
            </Tooltip>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID ({t("sampleBadge")})</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Valeur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono">ROW-1</TableCell>
                <TableCell>
                  <UiBadge tone="trust">Vérifié</UiBadge>
                </TableCell>
                <TableCell>Exemple A</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Pagination currentPage={page} totalPages={3} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Card id="stats">
        <CardHeader>
          <CardTitle>{t("feedbackHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 rounded-card border border-border p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
          <EmptyState
            title={tStates("emptyDefaultTitle")}
            description={tStates("emptyDefaultDescription")}
          />
          <ErrorState
            title={tStates("errorDefaultTitle")}
            description={tStates("errorDefaultDescription")}
            retryLabel={tStates("retry")}
            onRetry={() => pushToast({ title: tStates("retry"), tone: "info" })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
