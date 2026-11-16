import Link from "next/link";
import { FONT_VARIABLES_CLASS } from "@/lib/fonts";

export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`dark ${FONT_VARIABLES_CLASS}`} data-theme="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-fg antialiased">
        <p className="font-mono text-sm font-bold text-accent">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-fg">Page introuvable</h1>
        <p className="mt-2 max-w-md text-sm text-fg-muted">
          La ressource demandée n&apos;existe pas ou n&apos;est pas accessible dans cet
          environnement.
        </p>
        <Link
          href="/fr"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Retour à l&apos;accueil
        </Link>
      </body>
    </html>
  );
}
