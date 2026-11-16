import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bonuvo.vercel.app").replace(
    /\/+$/,
    "",
  );
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/fr/", "/en/"],
        disallow: ["/fr/admin/", "/en/admin/", "/fr/compte/", "/en/compte/", "/api/", "/go/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
