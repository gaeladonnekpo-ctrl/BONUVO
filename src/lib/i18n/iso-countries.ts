export interface IsoCountrySeed {
  code: string;
  nameFr: string;
  nameEn: string;
  currencyCode: string;
  defaultLocale: "fr" | "en";
  active: boolean;
}

export const ISO_3166_ALPHA2_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ " +
  "BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS " +
  "BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN " +
  "CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE " +
  "EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF " +
  "GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM " +
  "HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM " +
  "JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC " +
  "LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK " +
  "ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA " +
  "NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG " +
  "PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS " +
  "ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO " +
  "TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI " +
  "VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const FRANCOPHONE_COUNTRIES = new Set(
  "BE BF BI BJ BL CA CD CF CG CH CI CM DJ FR GA GF GN GP HT KM LU MA MC MF MG ML MQ MR NC NE PF PM RE RW SC SN TD TG TN VU WF YT".split(
    " ",
  ),
);

const ACTIVE_LAUNCH_MARKETS = new Set(
  "BJ CI SN CM CD MA NG ZA FR BE CH GB ES CA BR MX IN AU".split(" "),
);

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  AE: "AED",
  AR: "ARS",
  AU: "AUD",
  BD: "BDT",
  BF: "XOF",
  BG: "BGN",
  BJ: "XOF",
  BO: "BOB",
  BR: "BRL",
  CA: "CAD",
  CD: "CDF",
  CF: "XAF",
  CG: "XAF",
  CH: "CHF",
  CI: "XOF",
  CL: "CLP",
  CM: "XAF",
  CN: "CNY",
  CO: "COP",
  CZ: "CZK",
  DK: "DKK",
  DZ: "DZD",
  EG: "EGP",
  GA: "XAF",
  GB: "GBP",
  GH: "GHS",
  GN: "GNF",
  GQ: "XAF",
  GW: "XOF",
  HK: "HKD",
  HU: "HUF",
  ID: "IDR",
  IL: "ILS",
  IN: "INR",
  JP: "JPY",
  KE: "KES",
  KR: "KRW",
  MA: "MAD",
  MG: "MGA",
  ML: "XOF",
  MX: "MXN",
  MY: "MYR",
  MZ: "MZN",
  NE: "XOF",
  NG: "NGN",
  NO: "NOK",
  NZ: "NZD",
  PE: "PEN",
  PH: "PHP",
  PK: "PKR",
  PL: "PLN",
  QA: "QAR",
  RO: "RON",
  RW: "RWF",
  SA: "SAR",
  SE: "SEK",
  SG: "SGD",
  SN: "XOF",
  TD: "XAF",
  TG: "XOF",
  TH: "THB",
  TN: "TND",
  TR: "TRY",
  TZ: "TZS",
  UA: "UAH",
  UG: "UGX",
  US: "USD",
  UY: "UYU",
  VN: "VND",
  ZA: "ZAR",
  ZM: "ZMW",
};

const EUR_COUNTRIES = new Set(
  "AD AT BE CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MQ MT NL PT RE SI SK SM VA YT".split(
    " ",
  ),
);

export function buildIsoCountriesSeed(): IsoCountrySeed[] {
  const frNames = new Intl.DisplayNames(["fr"], { type: "region" });
  const enNames = new Intl.DisplayNames(["en"], { type: "region" });

  return ISO_3166_ALPHA2_CODES.map((code) => {
    const currencyCode = CURRENCY_BY_COUNTRY[code] ?? (EUR_COUNTRIES.has(code) ? "EUR" : "USD");
    return {
      code,
      nameFr: frNames.of(code) ?? code,
      nameEn: enNames.of(code) ?? code,
      currencyCode,
      defaultLocale: FRANCOPHONE_COUNTRIES.has(code) ? "fr" : "en",
      active: ACTIVE_LAUNCH_MARKETS.has(code),
    };
  });
}
