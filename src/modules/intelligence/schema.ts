import { z } from "zod";

export const DATE_STRING_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dateStringSchema = z
  .string()
  .trim()
  .regex(DATE_STRING_REGEX, "Format de date invalide (attendu YYYY-MM-DD).")
  .refine((val) => !Number.isNaN(Date.parse(`${val}T00:00:00.000Z`)), "Date invalide.");

export const aggregateMetricsInputSchema = z
  .object({
    fromDate: dateStringSchema.optional(),
    toDate: dateStringSchema.optional(),
  })
  .refine(
    (data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate,
    "fromDate ne peut pas être postérieure à toDate.",
  );

export const GROUP_BY_OPTIONS = ["day", "week", "month"] as const;
export type MetricGroupBy = (typeof GROUP_BY_OPTIONS)[number];

export const DRILL_DIMENSIONS = ["bookmaker", "country", "campaign", "offer"] as const;
export type DrillDimension = (typeof DRILL_DIMENSIONS)[number];

export const DRILL_STEPS = ["clicks", "registrations", "first_deposits", "commissions"] as const;
export type DrillStep = (typeof DRILL_STEPS)[number];

export const intelligenceFilterSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  country: z.string().trim().toUpperCase().max(8).optional(),
  bookmakerId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  groupBy: z.enum(GROUP_BY_OPTIONS).default("day"),
  drillDimension: z.enum(DRILL_DIMENSIONS).optional(),
  drillId: z.string().trim().max(64).optional(),
  drillStep: z.enum(DRILL_STEPS).optional(),
});

export type IntelligenceFilterInput = z.infer<typeof intelligenceFilterSchema>;

export const EXPORT_REPORTS = [
  "daily-overview",
  "bookmakers",
  "countries",
  "campaigns",
  "offers",
] as const;
export type ExportReportType = (typeof EXPORT_REPORTS)[number];

export const exportReportParamSchema = z.enum(EXPORT_REPORTS);
