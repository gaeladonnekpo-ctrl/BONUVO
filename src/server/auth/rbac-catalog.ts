import "server-only";

export const ROLE_NAMES = ["super_admin", "admin", "editor", "analyst", "member"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const PERMISSION_KEYS = [
  "admin.access",
  "offers.read",
  "offers.write",
  "offers.publish",
  "links.manage",
  "conversions.manage",
  "predictions.manage",
  "content.write",
  "community.manage",
  "users.manage",
  "roles.manage",
  "settings.read",
  "settings.manage",
  "stats.read",
  "stats.export",
  "audit.read",
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface RoleDefinition {
  name: RoleName;
  description: string;
  requiresTotp: boolean;
  permissions: readonly PermissionKey[];
}

export interface PermissionDefinition {
  key: PermissionKey;
  description: string;
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  { key: "admin.access", description: "Accès au back-office d'administration" },
  { key: "offers.read", description: "Lecture du catalogue bookmakers, offres et codes" },
  { key: "offers.write", description: "Création et modification du catalogue et des offres" },
  { key: "offers.publish", description: "Publication et dépublication des offres" },
  { key: "links.manage", description: "Gestion des liens d'affiliation et réseaux" },
  {
    key: "conversions.manage",
    description: "Gestion des conversions, imports et statuts de commissions",
  },
  { key: "predictions.manage", description: "Gestion des pronostics et coupons" },
  { key: "content.write", description: "Rédaction et gestion des actualités" },
  { key: "community.manage", description: "Gestion des canaux communautaires et notifications" },
  { key: "users.manage", description: "Gestion des utilisateurs (hors super_admin)" },
  { key: "roles.manage", description: "Attribution et révocation des rôles critiques" },
  { key: "settings.read", description: "Lecture des paramètres de la plateforme" },
  { key: "settings.manage", description: "Modification des paramètres de la plateforme" },
  { key: "stats.read", description: "Consultation des tableaux de bord et indicateurs" },
  { key: "stats.export", description: "Export CSV des statistiques" },
  { key: "audit.read", description: "Consultation du journal d'audit et des événements sécurité" },
] as const;

export const ROLE_CATALOG: readonly RoleDefinition[] = [
  {
    name: "super_admin",
    description: "Super-administrateur : accès complet et gouvernance des rôles",
    requiresTotp: true,
    permissions: [...PERMISSION_KEYS],
  },
  {
    name: "admin",
    description: "Administrateur : gestion métier complète hors comptes super_admin et paramètres",
    requiresTotp: true,
    permissions: [
      "admin.access",
      "offers.read",
      "offers.write",
      "offers.publish",
      "links.manage",
      "conversions.manage",
      "predictions.manage",
      "content.write",
      "community.manage",
      "users.manage",
      "settings.read",
      "stats.read",
      "stats.export",
      "audit.read",
    ],
  },
  {
    name: "editor",
    description: "Éditeur : préparation des fiches, offres, pronostics et contenus",
    requiresTotp: true,
    permissions: [
      "admin.access",
      "offers.read",
      "offers.write",
      "predictions.manage",
      "content.write",
      "community.manage",
      "stats.read",
    ],
  },
  {
    name: "analyst",
    description: "Analyste : lecture seule des indicateurs, catalogue et exports",
    requiresTotp: true,
    permissions: ["admin.access", "offers.read", "stats.read", "stats.export"],
  },
  {
    name: "member",
    description: "Membre inscrit : espace personnel uniquement, aucun droit d'administration",
    requiresTotp: false,
    permissions: [],
  },
] as const;

export function roleRequiresTotp(roleNames: readonly string[]): boolean {
  return ROLE_CATALOG.some((role) => role.requiresTotp && roleNames.includes(role.name));
}
