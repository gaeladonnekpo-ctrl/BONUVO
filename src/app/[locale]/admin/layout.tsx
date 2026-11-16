import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { isDesignShowcaseEnabled } from "@/lib/design/showcase-guard";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminShell showDevDesignLink={isDesignShowcaseEnabled()}>{children}</AdminShell>;
}
