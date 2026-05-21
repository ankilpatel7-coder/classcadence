"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  updateAdminProfileAction,
  removeAdminAction,
  type UpdateAdminState,
} from "../../actions";

type Admin = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

const initialState: UpdateAdminState = { error: null, success: false };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-bg disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save name"}
    </button>
  );
}

function RemoveButton({ adminEmail }: { adminEmail: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Remove "${adminEmail}" as an admin? This deletes their login ` +
              `account entirely — they will no longer be able to sign in. ` +
              `You can invite them again afterwards.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function AdminRow({
  admin,
  tenantId,
}: {
  admin: Admin;
  tenantId: string;
}) {
  const [state, formAction] = useFormState(updateAdminProfileAction, initialState);

  return (
    <div className="rounded-md border border-line bg-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{admin.email}</p>
          <p className="text-xs text-muted">
            Added {new Date(admin.created_at).toLocaleDateString()}
          </p>
        </div>
        <form action={removeAdminAction}>
          <input type="hidden" name="admin_id" value={admin.id} />
          <input type="hidden" name="tenant_id" value={tenantId} />
          <RemoveButton adminEmail={admin.email} />
        </form>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="admin_id" value={admin.id} />
        <input type="hidden" name="tenant_id" value={tenantId} />

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor={`full_name_${admin.id}`}
            className="block text-xs font-medium text-muted"
          >
            Full name
          </label>
          <input
            id={`full_name_${admin.id}`}
            name="full_name"
            type="text"
            defaultValue={admin.full_name ?? ""}
            maxLength={120}
            className="form-input mt-1"
          />
        </div>

        <SaveButton />
      </form>

      {state.error ? (
        <p className="mt-2 text-xs text-danger">{state.error}</p>
      ) : state.success ? (
        <p className="mt-2 text-xs text-success">Saved.</p>
      ) : null}
    </div>
  );
}
