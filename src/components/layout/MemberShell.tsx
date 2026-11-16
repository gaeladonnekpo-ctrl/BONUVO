import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export interface MemberNavLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface MemberShellProps {
  children: ReactNode;
  navItems: readonly MemberNavLink[];
  navAriaLabel: string;
  initialCountry?: string;
  showDevDesignLink?: boolean;
}

/**
 * Member account shell combining the public header/footer with an account sidebar.
 */
export function MemberShell({
  children,
  navItems,
  navAriaLabel,
  initialCountry,
  showDevDesignLink = false,
}: MemberShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <Header initialCountry={initialCountry} />
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside aria-label={navAriaLabel}>
          <nav className="flex flex-wrap gap-1.5 rounded-card border border-border bg-surface p-2 lg:flex-col">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-elevated hover:text-fg"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
        <main id="member-main-content" className="min-w-0">
          {children}
        </main>
      </div>
      <Footer showDevDesignLink={showDevDesignLink} />
    </div>
  );
}
