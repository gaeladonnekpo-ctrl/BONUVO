"use client";

import * as React from "react";
import type { CountryOption } from "@/lib/i18n/countries";

const PublicCountriesContext = React.createContext<readonly CountryOption[] | null>(null);

export function PublicCountriesProvider({
  countries,
  children,
}: {
  countries?: readonly CountryOption[];
  children: React.ReactNode;
}) {
  return (
    <PublicCountriesContext.Provider value={countries ?? null}>
      {children}
    </PublicCountriesContext.Provider>
  );
}

export function usePublicCountries(): readonly CountryOption[] | null {
  return React.useContext(PublicCountriesContext);
}
