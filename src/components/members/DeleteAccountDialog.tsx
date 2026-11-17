import { AlertTriangle, RotateCcw } from "lucide-react";
import { cancelDeletionAction, requestDeletionAction } from "@/modules/members/actions";

interface DeleteAccountDialogProps {
  locale: "fr" | "en";
  userId: string;
  pendingDeletion: {
    id: string;
    status: string;
    requestedAt: Date;
    scheduledPurgeAt: Date;
  } | null;
}

export function DeleteAccountDialog({ locale, userId, pendingDeletion }: DeleteAccountDialogProps) {
  const isFr = locale === "fr";

  return (
    <section className="rounded-2xl border border-danger/30 bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-fg">
            {isFr
              ? "Suppression de compte (délai de rétractation 14 jours)"
              : "Account deletion (14-day grace period)"}
          </h2>
          <p className="text-sm text-fg-muted">
            {isFr
              ? "Conformément à notre politique de confidentialité, toute demande de suppression est programmée à +14 jours et reste annulable à tout moment avant l'échéance."
              : "Any account deletion request is scheduled 14 days ahead and can be cancelled anytime before execution."}
          </p>
        </div>
      </div>

      {pendingDeletion ? (
        <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
          <p className="text-sm font-semibold text-fg">
            {isFr
              ? "Une demande de suppression est actuellement en attente."
              : "A deletion request is currently pending."}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {isFr ? "Purge et anonymisation prévues le : " : "Scheduled purge on: "}
            <strong className="font-mono text-fg">
              {new Intl.DateTimeFormat(isFr ? "fr-FR" : "en-US", {
                dateStyle: "long",
              }).format(new Date(pendingDeletion.scheduledPurgeAt))}
            </strong>
          </p>

          <form action={cancelDeletionAction} className="mt-3">
            <input type="hidden" name="userId" value={userId} />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-fg transition hover:bg-bg"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span>
                {isFr
                  ? "Annuler la suppression et conserver mon compte"
                  : "Cancel deletion & keep my account"}
              </span>
            </button>
          </form>
        </div>
      ) : (
        <form action={requestDeletionAction} className="mt-4 space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <label className="block space-y-1 text-xs font-semibold text-fg">
            <span>
              {isFr ? "Motif optionnel de fermeture" : "Optional reason for closing account"}
            </span>
            <input
              name="reason"
              placeholder={
                isFr
                  ? "Ex: Je n'utilise plus les alertes membres"
                  : "E.g. I no longer need member alerts"
              }
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-fg"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-danger px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            {isFr ? "Planifier la suppression dans 14 jours" : "Schedule deletion in 14 days"}
          </button>
        </form>
      )}
    </section>
  );
}
