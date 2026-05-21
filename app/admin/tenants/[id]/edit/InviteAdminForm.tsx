"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { inviteAdminAction, type InviteAdminState } from "../../actions";

const initialState: InviteAdminState = { error: null, success: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send invite"}
    </button>
  );
}

export function InviteAdminForm({ tenantId }: { tenantId: string }) {
  const [state, formAction] = useFormState(inviteAdminAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="tenant_id" value={tenantId} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="invite_name" className="block text-xs font-medium text-muted">
            Full name (optional)
          </label>
          <input
            id="invite_name"
            name="full_name"
            type="text"
            maxLength={120}
            className="form-input mt-1"
          />
        </div>
        <div>
          <label
            htmlFor="invite_email"
            className="block text-xs font-medium text-muted"
          >
            Email
          </label>
          <input
            id="invite_email"
            name="email"
            type="email"
            required
            className="form-input mt-1"
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md bg-success-soft px-3 py-2 text-xs text-success">
          Invite sent. They&apos;ll receive an email with a link to set their password.
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
