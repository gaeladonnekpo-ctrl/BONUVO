import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BONUVO — Offres, Codes Promo & Pronostics",
    short_name: "BONUVO",
    description:
      "BONUVO: SMART OFFERS. BETTER CHOICES. Comparez les bookmakers, codes promo vérifiés et pronostics BONUVO AI.",
    start_url: "/fr",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#101014",
    theme_color: "#FF7A1A",
    lang: "fr",
    categories: ["sports", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
