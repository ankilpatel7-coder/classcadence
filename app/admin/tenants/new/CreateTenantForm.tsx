"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  createTenantAction,
  type CreateTenantState,
} from "../actions";

const initialState: CreateTenantState = { error: null, fieldErrors: {} };

// A pragmatic short list of common IANA zones. The full picker comes later (BA FR-LM-02).
const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "Europe/London",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Creating…" : "Create tenant"}
    </button>
  );
}

export function CreateTenantForm() {
  const [state, formAction] = useFormState(createTenantAction, initialState);
  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5">
      <Field
        id="name"
        label="Tenant name"
        hint="The name shown to staff (e.g. “Lincoln Learning Center”)."
        error={fe.name}
      >
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          className="form-input"
        />
      </Field>

      <Field
        id="legal_name"
        label="Legal name"
        hint="Optional. Used on invoices once billing ships."
        error={fe.legal_name}
      >
        <input id="legal_name" name="legal_name" type="text" className="form-input" />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id="default_iana_tz"
          label="Default timezone"
          hint="Used as the default for new locations."
          error={fe.default_iana_tz}
        >
          <select
            id="default_iana_tz"
            name="default_iana_tz"
            required
            defaultValue="America/New_York"
            className="form-input"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="country"
          label="Country"
          hint="ISO 3166-1 alpha-2 (e.g. US, CA, GB, IN)."
          error={fe.country}
        >
          <input
            id="country"
            name="country"
            type="text"
            required
            defaultValue="US"
            maxLength={2}
            className="form-input uppercase"
          />
        </Field>
      </div>

      <div className="rounded-md border border-line bg-bg/60 p-4">
        <h2 className="text-sm font-medium text-ink">Tenant Admin (optional)</h2>
        <p className="mt-1 text-xs text-muted">
          If you provide an email, ClassCadence will send them a Supabase invite link
          and promote them to Tenant Admin on this tenant. Skip to create the tenant
          alone and invite an admin later.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field id="admin_name" label="Admin full name" error={fe.admin_name}>
            <input id="admin_name" name="admin_name" type="text" className="form-input" />
          </Field>
          <Field id="admin_email" label="Admin email" error={fe.admin_email}>
            <input
              id="admin_email"
              name="admin_email"
              type="email"
              className="form-input"
            />
          </Field>
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link
          href="/admin/tenants"
          className="btn-secondary"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
