"use client";

import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsFloat,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { OFFER_TYPE_FILTER_OPTIONS, PUBLIC_SORT_OPTIONS } from "@/modules/offers/public-schema";

export const offerCatalogQueryParsers = {
  type: parseAsStringLiteral(OFFER_TYPE_FILTER_OPTIONS).withDefault("all"),
  paiement: parseAsString.withDefault(""),
  depotMax: parseAsFloat,
  avecCode: parseAsBoolean.withDefault(false),
  bookmaker: parseAsString.withDefault(""),
  q: parseAsString.withDefault(""),
  tri: parseAsStringLiteral(PUBLIC_SORT_OPTIONS).withDefault("rank"),
  compare: parseAsArrayOf(parseAsString).withDefault([]),
};
