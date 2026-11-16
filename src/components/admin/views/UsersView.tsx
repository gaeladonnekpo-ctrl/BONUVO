"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DataTable, type AdminTableColumn } from "@/components/admin/DataTable";
import { UiBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/lib/admin/action-result";
import { assignRoleAction, revokeRoleAction, setUserStatusAction } from "@/modules/admin/actions";

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  countryCode: string;
  status: string;
  roles: string[];
}

const ASSIGNABLE_ROLES = ["super_admin", "admin", "editor", "analyst", "member"] as const;

export function UsersView({
  users,
  actorIsSuperAdmin,
}: {
  users: AdminUserRow[];
  actorIsSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = React.useState<AdminActionResult | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<Record<string, string>>({});

  async function runAction(exec: () => Promise<AdminActionResult>) {
    const res = await exec();
    setFeedback(res);
    if (res.ok) router.refresh();
  }

  const columns: AdminTableColumn<AdminUserRow>[] = [
    {
      accessorKey: "displayName",
      header: "Utilisateur",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-fg">{row.original.displayName}</p>
          <p className="text-xs text-fg-muted">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: "roles",
      header: "Rôles",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {row.original.roles.map((role) => (
            <button
              key={role}
              type="button"
              title="Cliquer pour révoquer"
              onClick={() => runAction(() => revokeRoleAction(row.original.id, role))}
              className="rounded-pill bg-surface-elevated px-2 py-0.5 text-xs font-medium text-fg hover:bg-danger-soft hover:text-danger"
            >
              {role} ×
            </button>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "État",
      cell: ({ row }) => (
        <UiBadge tone={row.original.status === "active" ? "trust" : "danger"}>
          {row.original.status}
        </UiBadge>
      ),
    },
    {
      id: "manage",
      header: "Gestion",
      enableSorting: false,
      cell: ({ row }) => {
        const targetRoles = row.original.roles;
        const lockedByB7 = !actorIsSuperAdmin && targetRoles.includes("super_admin");
        const chosen = selectedRole[row.original.id] ?? "editor";
        return (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={`Rôle pour ${row.original.email}`}
              disabled={lockedByB7}
              value={chosen}
              onChange={(e) =>
                setSelectedRole((prev) => ({ ...prev, [row.original.id]: e.target.value }))
              }
              className="h-9 rounded-input border border-border bg-surface px-2 text-xs text-fg"
            >
              {ASSIGNABLE_ROLES.filter((r) => actorIsSuperAdmin || r !== "super_admin").map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={lockedByB7}
              onClick={() => runAction(() => assignRoleAction(row.original.id, chosen))}
            >
              Ajouter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={lockedByB7}
              onClick={() =>
                runAction(() =>
                  setUserStatusAction(
                    row.original.id,
                    row.original.status === "active" ? "suspended" : "active",
                  ),
                )
              }
            >
              {row.original.status === "active" ? "Suspendre" : "Réactiver"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {feedback ? (
        <div
          role="status"
          className={
            feedback.ok
              ? "rounded-lg border border-success/40 bg-success-soft px-3 py-2 text-sm text-fg"
              : "rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Rechercher un compte par nom ou e-mail..."
        emptyTitle="Aucun compte utilisateur"
        emptyDescription="Les comptes inscrits ou créés par script apparaîtront ici."
      />
    </div>
  );
}
