import { savePostAction } from "@/modules/community/actions";
import { CommunitySubNav } from "./CommunitySubNav";

interface ContentAdminViewProps {
  locale: string;
  posts: Array<{
    id: string;
    slug: string;
    postType: string;
    titleFr: string;
    countryCode: string;
    status: string;
    publishedAt: Date | null;
  }>;
}

export function ContentAdminView({ locale, posts }: ContentAdminViewProps) {
  const isFr = locale === "fr";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-fg-muted">
          BONUVO ÉDITORIAL
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {isFr ? "Annonces & Actualités" : "Announcements & News"}
        </h1>
        <p className="text-sm text-fg-muted">
          {isFr
            ? "Tous les contenus sont automatiquement nettoyés côté serveur (suppression de tout script ou HTML actif)."
            : "All content is sanitized server-side (all active HTML and scripts are stripped)."}
        </p>
      </div>

      <CommunitySubNav locale={locale} activeTab="contenus" />

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <h2 className="font-display text-lg font-bold text-fg">
          {isFr ? "Rédiger ou mettre à jour un article" : "Create or update a post"}
        </h2>
        <form action={savePostAction} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Type" : "Type"}</span>
              <select
                name="postType"
                defaultValue="news"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              >
                <option value="news">Actualité</option>
                <option value="announcement">Annonce officielle</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Statut" : "Status"}</span>
              <select
                name="status"
                defaultValue="published"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              >
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Pays" : "Country"}</span>
              <input
                name="countryCode"
                defaultValue="GLOBAL"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Titre (FR)" : "Title (FR)"}</span>
              <input
                name="titleFr"
                required
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold text-fg">
              <span>{isFr ? "Slug (optionnel)" : "Slug (optional)"}</span>
              <input
                name="slug"
                placeholder="nouveau-bonus-afrique"
                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-semibold text-fg">
            <span>{isFr ? "Chapô / Extrait (FR)" : "Excerpt (FR)"}</span>
            <input
              name="excerptFr"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <label className="block space-y-1 text-xs font-semibold text-fg">
            <span>{isFr ? "Corps de l'article (FR)" : "Article body (FR)"}</span>
            <textarea
              name="bodyFr"
              required
              rows={5}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-fg">
            <input type="checkbox" name="featured" className="size-4 rounded border-border" />
            <span>{isFr ? "Mettre à la une" : "Feature post"}</span>
          </label>

          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            {isFr ? "Publier le contenu" : "Save post"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-base font-bold text-fg">
          {isFr ? "Articles enregistrés" : "Saved posts"} ({posts.length})
        </h3>
        <ul className="mt-3 divide-y divide-border text-sm">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-semibold text-fg">{post.titleFr}</p>
                <p className="font-mono text-xs text-fg-muted">/{post.slug}</p>
              </div>
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-fg">
                {post.postType} · {post.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
