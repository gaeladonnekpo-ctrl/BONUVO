import { useLocale, useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OFFICIAL_BONUVO_CHANNELS, SocialBrandIcon } from "@/components/community/SocialBrandIcon";
import { Link } from "@/i18n/navigation";
import { PUBLIC_PRIMARY_LINKS, TRUST_PAGE_LINKS } from "./navigation-links";

export interface FooterProps {
  showDevDesignLink?: boolean;
}

export function Footer({ showDevDesignLink = false }: FooterProps) {
  const tBrand = useTranslations("brand");
  const tNav = useTranslations("nav");
  const tTrust = useTranslations("trustPages");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const isFr = locale !== "en";
  const currentYear = 2026;

  return (
    <footer className="border-t border-border bg-surface-subtle pt-10 pb-20 sm:pb-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3 md:col-span-2">
            <BrandLogo size="sm" showTagline taglineText={tBrand("tagline")} />
            <p className="inline-block rounded-md border border-border-strong bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-fg">
              {tFooter("adultBadge")}
            </p>
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-fg">
                {isFr ? "Rejoindre nos réseaux officiels" : "Join our official channels"}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {OFFICIAL_BONUVO_CHANNELS.map((ch) => (
                  <a
                    key={ch.id}
                    href={ch.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-fg shadow-2xs transition hover:border-accent/40 hover:bg-surface-elevated"
                  >
                    <SocialBrandIcon platform={ch.platform} className="size-4 shrink-0" />
                    <span>{isFr ? ch.labelFr : ch.labelEn}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-xs font-bold tracking-wider text-fg uppercase">
              {tFooter("navigationHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {PUBLIC_PRIMARY_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-fg-muted transition-colors hover:text-fg">
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-xs font-bold tracking-wider text-fg uppercase">
              {tFooter("trustHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {TRUST_PAGE_LINKS.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-fg-muted transition-colors hover:text-fg">
                    {tTrust(`${item.key}.nav`)}
                  </Link>
                </li>
              ))}
              {showDevDesignLink ? (
                <li>
                  <Link
                    href="/admin/design"
                    className="font-mono text-xs text-accent underline underline-offset-4 hover:text-accent-hover"
                  >
                    {tFooter("designSystemLink")}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-fg-muted">
          <p>{tFooter("rights", { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  );
}
