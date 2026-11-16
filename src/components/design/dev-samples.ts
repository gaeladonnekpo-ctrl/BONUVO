import type {
  CommunityChannelLink,
  OfferCardData,
  PartnerGridItem,
} from "@/components/business/types";

export const DEV_SAMPLE_OFFER: OfferCardData = {
  id: "dev-example-offer-1",
  rank: 1,
  bookmakerName: "Bookmaker Exemple A — Exemple de développement",
  bookmakerShortName: "EX-A",
  bonusHeadline: "Offre d'illustration (exemple de développement)",
  bonusAmountDisplay: "100 000 XOF (exemple de développement)",
  ratingScore: 4.5,
  ratingMax: 5,
  badges: ["recommended", "exclusive", "new", "verified"],
  highlights: [
    "Exemple de développement : mise minimale illustrative",
    "Exemple de développement : méthode locale affichée en clair",
    "Exemple de développement : délai indicatif 30 jours",
  ],
  weaknessNote: "Exemple de développement : conditions strictes sur paris combinés.",
  rolloverText: "5x (exemple de développement)",
  paymentMethods: ["Mobile Money (exemple)", "Carte bancaire (exemple)"],
  promoCode: "DEV-EXAMPLE-100",
  promoValidOn: "Sport (exemple de développement)",
  verifiedDateLabel: "2026-11-16 (exemple de développement)",
  licenseLabel: "Licence test (exemple de développement)",
  termsSummary:
    "Ceci est uniquement un exemple de développement utilisé sur /admin/design. Aucune donnée réelle ni offre commerciale n'est présentée ici.",
  isDevExample: true,
};

export const DEV_SAMPLE_PARTNERS: readonly PartnerGridItem[] = [
  { id: "dev-p1", name: "Partenaire Exemple 1", shortCode: "EX1", isDevExample: true },
  { id: "dev-p2", name: "Partenaire Exemple 2", shortCode: "EX2", isDevExample: true },
  { id: "dev-p3", name: "Partenaire Exemple 3", shortCode: "EX3", isDevExample: true },
  { id: "dev-p4", name: "Partenaire Exemple 4", shortCode: "EX4", isDevExample: true },
];

export const DEV_SAMPLE_CHANNELS: readonly CommunityChannelLink[] = [
  {
    id: "dev-tg",
    platform: "telegram",
    href: "https://t.me/exemple_dev_inactif",
    label: "Telegram (exemple de développement)",
    isDevExample: true,
  },
  {
    id: "dev-wa",
    platform: "whatsapp",
    href: "https://wa.me/exemple_dev_inactif",
    label: "WhatsApp (exemple de développement)",
    isDevExample: true,
  },
];
