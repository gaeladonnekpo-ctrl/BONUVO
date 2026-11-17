import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { getPublicPostBySlug } from "@/modules/community/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublicPostBySlug(slug);
  if (!post) {
    return { title: "BONUVO" };
  }
  const isFr = locale === "fr";
  return {
    title: `${isFr ? post.titleFr : post.titleEn || post.titleFr} — BONUVO`,
    description:
      (isFr ? post.excerptFr : post.excerptEn || post.excerptFr) ||
      (isFr ? post.bodyFr : post.bodyEn || post.bodyFr).slice(0, 155),
  };
}

export default async function PublicPostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isFr = locale === "fr";
  const post = await getPublicPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const title = isFr ? post.titleFr : post.titleEn || post.titleFr;
  const excerpt = isFr ? post.excerptFr : post.excerptEn || post.excerptFr;
  const body = isFr ? post.bodyFr : post.bodyEn || post.bodyFr;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={`/${locale}/communaute`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-fg hover:text-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        <span>{isFr ? "Retour à BONUVO COMMUNITY" : "Back to BONUVO COMMUNITY"}</span>
      </Link>

      <header className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
          <span className="rounded-full border border-border bg-surface-muted px-3 py-1 font-semibold text-fg">
            {post.postType === "announcement"
              ? isFr
                ? "Annonce officielle"
                : "Official announcement"
              : isFr
                ? "Actualité"
                : "News"}
          </span>
          <span>{post.countryCode}</span>
          {post.publishedAt ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden="true" />
              {new Intl.DateTimeFormat(isFr ? "fr-FR" : "en-US", {
                dateStyle: "long",
              }).format(new Date(post.publishedAt))}
            </span>
          ) : null}
        </div>

        <h1 className="font-display text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">
          {title}
        </h1>

        {excerpt ? (
          <p className="text-base font-medium leading-relaxed text-fg-muted">{excerpt}</p>
        ) : null}
      </header>

      <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-base leading-relaxed text-fg sm:p-8">
        {paragraphs.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
