"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateTenantAction,
  type UpdateTenantState,
} from "../../actions";

const initialState: UpdateTenantState = { error: null, fieldErrors: {} };

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

type Tenant = {
  id: string;
  name: string;
  legal_name: string | null;
  default_iana_tz: string;
  country: string;
  status: "active" | "suspended";
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function EditTenantForm({ tenant }: { tenant: Tenant }) {
  const [state, formAction] = useFormState(updateTenantAction, initialState);
  const fe = state.fieldErrors;

  const tzOptions = COMMON_TIMEZONES.includes(tenant.default_iana_tz)
    ? COMMON_TIMEZONES
    : [tenant.default_iana_tz, ...COMMON_TIMEZONES];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={tenant.id} />

      <Field id="name" label="Tenant name" error={fe.name}>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={tenant.name}
          className="form-input"
        />
      </Field>

      <Field id="legal_name" label="Legal name" error={fe.legal_name}>
        <input
          id="legal_name"
          name="legal_name"
          type="text"
          defaultValue={tenant.legal_name ?? ""}
          className="form-input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="default_iana_tz" label="Default timezone" error={fe.default_iana_tz}>
          <select
            id="default_iana_tz"
            name="default_iana_tz"
            required
            defaultValue={tenant.default_iana_tz}
            className="form-input"
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>

        <Field id="country" label="Country" error={fe.country}>
          <input
            id="country"
            name="country"
            type="text"
            required
            defaultValue={tenant.country}
            maxLength={2}
            className="form-input uppercase"
          />
        </Field>
      </div>

      <Field
        id="status"
        label="Status"
        hint="Suspended tenants block all logins for their members."
        error={fe.status}
      >
        <select
          id="status"
          name="status"
          defaultValue={tenant.status}
          className="form-input"
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </Field>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          Saved.
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
