import Link from "next/link";

interface CommunitySubNavProps {
  locale: string;
  activeTab: "communaute" | "contenus" | "notifications";
}

export function CommunitySubNav({ locale, activeTab }: CommunitySubNavProps) {
  const isFr = locale === "fr";
  const items = [
    {
      key: "communaute" as const,
      href: `/${locale}/admin/communaute`,
      label: isFr ? "Canaux & Coupons" : "Channels & Coupons",
    },
    {
      key: "contenus" as const,
      href: `/${locale}/admin/contenus`,
      label: isFr ? "Contenus & Actualités" : "Content & News",
    },
    {
      key: "notifications" as const,
      href: `/${locale}/admin/notifications`,
      label: isFr ? "Notifications & Consentements" : "Notifications & Consents",
    },
  ];

  return (
    <nav
      aria-label={isFr ? "Sous-navigation Communauté" : "Community sub-navigation"}
      className="flex flex-wrap gap-2 border-b border-border pb-3"
    >
      {items.map((item) => {
        const active = item.key === activeTab;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-accent text-accent-fg shadow-xs"
                : "border border-border bg-surface text-fg hover:bg-surface-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
