import dotenv from "dotenv";
import path from "node:path";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { buildIsoCountriesSeed } from "@/lib/i18n/iso-countries";
import { resolveSslOption, sanitizePostgresUrl } from "@/server/db/connection-config";
import * as schema from "@/server/db/schema";
import { parseServerEnv } from "@/server/env-schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const EMERGING_BETTING_MARKETS = [
  "KE",
  "GH",
  "TG",
  "BF",
  "ML",
  "NE",
  "GN",
  "GA",
  "CG",
  "TD",
  "RW",
  "TZ",
  "UG",
  "ZM",
  "ET",
  "EG",
  "DZ",
  "TN",
  "AO",
  "MZ",
  "MG",
  "AR",
  "CO",
  "CL",
  "PE",
  "UY",
  "EC",
  "PH",
  "ID",
  "VN",
  "TH",
  "MY",
  "SG",
  "PK",
  "BD",
] as const;

async function main() {
  console.log("[seed-countries] Connecting...");
  const env = parseServerEnv(process.env);
  const client = postgres(sanitizePostgresUrl(env.DATABASE_URL), {
    max: 2,
    prepare: false,
    connect_timeout: 15,
    ssl: resolveSslOption(env.DATABASE_SSL),
  });

  try {
    const db = drizzle(client, { schema });
    const iso = buildIsoCountriesSeed();

    console.log("[seed-countries] Step 1: reading existing countries...");
    const existing = await db.select().from(schema.countries);
    const byCode = new Map(existing.map((r) => [r.code, r]));

    const missing = iso.filter((c) => !byCode.has(c.code));
    if (missing.length > 0) {
      await db.insert(schema.countries).values(missing).onConflictDoNothing();
    }

    console.log("[seed-countries] Step 2: activating all 249 countries...");
    await db
      .update(schema.countries)
      .set({ active: true, updatedAt: new Date() })
      .where(eq(schema.countries.active, false));

    console.log("[seed-countries] Step 3: reading emerging targets, bookmakers, offers...");
    const cRows = await db
      .select()
      .from(schema.countries)
      .where(inArray(schema.countries.code, [...EMERGING_BETTING_MARKETS]));
    const bms = await db
      .select()
      .from(schema.bookmakers)
      .where(and(eq(schema.bookmakers.status, "active"), isNull(schema.bookmakers.deletedAt)));
    const offs = await db
      .select()
      .from(schema.offers)
      .where(and(eq(schema.offers.status, "published"), isNull(schema.offers.deletedAt)));
    console.log(
      `[seed-countries] Step 4: seeding bm=${bms.length} x countries=${cRows.length}, offers=${offs.length}`,
    );

    const bmCountryValues = [];
    for (const bm of bms) {
      for (const c of cRows) {
        bmCountryValues.push({
          bookmakerId: bm.id,
          countryId: c.id,
          eligible: true,
          localLicense: "",
          authorityName: "Curaçao Gaming Control Board",
          notes: "Marché international paris sportifs éligible",
          status: "active" as const,
        });
      }
    }
    for (let i = 0; i < bmCountryValues.length; i += 100) {
      await db
        .insert(schema.bookmakerCountries)
        .values(bmCountryValues.slice(i, i + 100))
        .onConflictDoNothing();
    }
    console.log("[seed-countries] Step 5: bookmaker_countries done.");

    const offerCountryValues = [];
    for (const off of offs) {
      for (const c of cRows) {
        offerCountryValues.push({
          offerId: off.id,
          countryId: c.id,
          rankOverride: null,
        });
      }
    }
    for (let i = 0; i < offerCountryValues.length; i += 100) {
      await db
        .insert(schema.offerCountries)
        .values(offerCountryValues.slice(i, i + 100))
        .onConflictDoNothing();
    }
    console.log("[seed-countries] Step 6: offer_countries done.");

    const activeRows = await db
      .select({ code: schema.countries.code })
      .from(schema.countries)
      .where(eq(schema.countries.active, true));

    console.log(`[seed-countries] COMPLETE active=${activeRows.length}`);
  } finally {
    await client.end({ timeout: 2 });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-countries] ERROR:", err);
    process.exit(1);
  });
