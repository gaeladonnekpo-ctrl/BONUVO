import { JetBrains_Mono, Plus_Jakarta_Sans, Unbounded } from "next/font/google";

export const unboundedFont = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display-family",
  display: "swap",
});

export const plusJakartaFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-family",
  display: "swap",
});

export const jetbrainsMonoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono-family",
  display: "swap",
});

export const FONT_VARIABLES_CLASS = `${unboundedFont.variable} ${plusJakartaFont.variable} ${jetbrainsMonoFont.variable}`;
