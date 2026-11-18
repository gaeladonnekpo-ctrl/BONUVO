"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton({ locale, label }: { locale: string; label: string }) {
  const [loading, setLoading] = React.useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      window.location.assign(`/${locale}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleSignOut} disabled={loading}>
      {label}
    </Button>
  );
}
