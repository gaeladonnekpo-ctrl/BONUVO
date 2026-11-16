export const PUBLIC_PRIMARY_LINKS = [
  { key: "offers", href: "/#offres" },
  { key: "bookmakers", href: "/#bookmakers" },
  { key: "promoCodes", href: "/#codes-promo" },
  { key: "predictions", href: "/#pronostics" },
  { key: "community", href: "/#communaute" },
] as const;

export const TRUST_PAGE_LINKS = [
  { key: "methodology", href: "/methodologie" },
  { key: "affiliation", href: "/affiliation" },
  { key: "responsible", href: "/jeu-responsable" },
  { key: "privacy", href: "/confidentialite" },
] as const;

export const ADMIN_NAV_LINKS = [
  { key: "dashboard", href: "/admin" },
  { key: "catalog", href: "/admin/catalogue" },
  { key: "bookmakers", href: "/admin/bookmakers" },
  { key: "offers", href: "/admin/offres" },
  { key: "promoCodes", href: "/admin/codes-promo" },
  { key: "countries", href: "/admin/pays" },
  { key: "affiliation", href: "/admin/affiliation" },
  { key: "users", href: "/admin/utilisateurs" },
  { key: "audit", href: "/admin/journal" },
  { key: "settings", href: "/admin/parametres" },
] as const;
