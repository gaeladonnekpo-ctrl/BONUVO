import Link from "next/link";
import { ArrowRight, Megaphone, Newspaper } from "lucide-react";
import type { PublicPostItem } from "@/modules/community/service";

interface PostCardProps {
  post: PublicPostItem;
  locale: "fr" | "en";
}

export function PostCard({ post, locale }: PostCardProps) {
  const isFr = locale === "fr";
  const isAnnouncement = post.postType === "announcement";
  const title = isFr ? post.titleFr : post.titleEn || post.titleFr;
  const excerpt =
    (isFr ? post.excerptFr : post.excerptEn || post.excerptFr) ||
    (isFr ? post.bodyFr : post.bodyEn || post.bodyFr).slice(0, 160);

  const formattedDate = post.publishedAt
    ? new Intl.DateTimeFormat(isFr ? "fr-FR" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(post.publishedAt))
    : null;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-fg">
            {isAnnouncement ? (
              <Megaphone className="size-3.5 text-accent" aria-hidden="true" />
            ) : (
              <Newspaper className="size-3.5 text-fg-muted" aria-hidden="true" />
            )}
            {isAnnouncement
              ? isFr
                ? "Annonce officielle"
                : "Official announcement"
              : isFr
                ? "Actualité"
                : "News"}
          </span>
          {formattedDate ? <time className="text-xs text-fg-muted">{formattedDate}</time> : null}
        </div>

        <h3 className="font-display text-lg font-bold tracking-tight text-fg">
          <Link href={`/${locale}/actualites/${post.slug}`} className="hover:underline">
            {title}
          </Link>
        </h3>

        {excerpt ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{excerpt}</p>
        ) : null}
      </div>

      <div className="mt-5 border-t border-border/70 pt-3">
        <Link
          href={`/${locale}/actualites/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg hover:text-accent"
        >
          <span>{isFr ? "Lire l'article complet" : "Read full post"}</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
