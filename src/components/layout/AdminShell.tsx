"use client";

import { Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

export interface AdminShellProps {
  children: React.ReactNode;
  showDevDesignLink?: boolean;
}

/**
 * Administration back-office shell with collapsible sidebar, utility topbar, and mobile drawer.
 */
export function AdminShell({ children, showDevDesignLink = false }: AdminShellProps) {
  const tAdmin = useTranslations("admin");
  const tNav = useTranslations("nav");
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <div className="hidden lg:block lg:shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          showDevDesignLink={showDevDesignLink}
          className="sticky top-0 h-screen"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={tNav("openMenu")}
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent className="top-0 right-auto left-0 h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r p-0">
                <DialogHeader className="sr-only">
                  <DialogTitle>{tAdmin("badge")}</DialogTitle>
                  <DialogDescription>{tAdmin("profileRole")}</DialogDescription>
                </DialogHeader>
                <Sidebar
                  collapsed={false}
                  showDevDesignLink={showDevDesignLink}
                  onNavigate={() => setMobileOpen(false)}
                  className="w-full border-r-0"
                />
              </DialogContent>
            </Dialog>

            <UiBadge tone="neutral">{tAdmin("badge")}</UiBadge>

            <div className="relative hidden w-64 sm:block">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label={tAdmin("searchLabel")}
                placeholder={tAdmin("searchPlaceholder")}
                className="h-9 pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-fg-muted md:inline">
              {tAdmin("profileRole")}
            </span>
            <LocaleSwitcher />
            <ThemeToggle compact />
          </div>
        </header>

        <main id="admin-main-content" className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
