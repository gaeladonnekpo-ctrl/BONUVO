import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
  const currentYear = 2026;

  return (
    <footer className="border-t border-border bg-surface-subtle pt-10 pb-20 sm:pb-12">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <BrandLogo size="sm" showTagline taglineText={tBrand("tagline")} />
            <p className="inline-block rounded-md border border-border-strong bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-fg">
              {tFooter("adultBadge")}
            </p>
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
