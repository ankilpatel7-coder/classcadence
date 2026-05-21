"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteTenantAction } from "./actions";

function Inner({ tenantName }: { tenantName: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Delete "${tenantName}"? This permanently removes the tenant and ` +
              `all its locations, classrooms, students, and history. ` +
              `Auth users (login accounts) are not deleted automatically — ` +
              `clean those up in Supabase if needed.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export function DeleteTenantButton({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  return (
    <form action={deleteTenantAction} className="inline-block">
      <input type="hidden" name="id" value={tenantId} />
      <Inner tenantName={tenantName} />
    </form>
  );
}
