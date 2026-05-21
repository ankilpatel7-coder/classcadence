"use client";

export type HouseholdFieldErrors = Partial<Record<string, string>>;

export type HouseholdDefaults = {
  primary_parent_name?: string;
  primary_email?: string | null;
  primary_phone?: string | null;
  secondary_parent_name?: string | null;
  secondary_email?: string | null;
  secondary_phone?: string | null;
  mailing_address?: string | null;
  notify_email?: boolean;
  notify_whatsapp?: boolean;
};

export function HouseholdFields({
  defaults,
  fieldErrors,
}: {
  defaults: HouseholdDefaults;
  fieldErrors: HouseholdFieldErrors;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Primary contact
        </h3>
        <div className="mt-3 space-y-3">
          <Field id="primary_parent_name" label="Parent / guardian name" required error={fieldErrors.primary_parent_name}>
            <input
              id="primary_parent_name"
              name="primary_parent_name"
              type="text"
              required
              maxLength={120}
              defaultValue={defaults.primary_parent_name ?? ""}
              className="form-input"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field id="primary_email" label="Email" error={fieldErrors.primary_email}>
              <input
                id="primary_email"
                name="primary_email"
                type="email"
                defaultValue={defaults.primary_email ?? ""}
                className="form-input"
              />
            </Field>
            <Field id="primary_phone" label="Phone" error={fieldErrors.primary_phone}>
              <input
                id="primary_phone"
                name="primary_phone"
                type="tel"
                defaultValue={defaults.primary_phone ?? ""}
                className="form-input"
              />
            </Field>
          </div>
          <p className="text-xs text-muted">At least one of email or phone is required.</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Secondary contact (optional)
        </h3>
        <div className="mt-3 space-y-3">
          <Field id="secondary_parent_name" label="Name" error={fieldErrors.secondary_parent_name}>
            <input
              id="secondary_parent_name"
              name="secondary_parent_name"
              type="text"
              maxLength={120}
              defaultValue={defaults.secondary_parent_name ?? ""}
              className="form-input"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field id="secondary_email" label="Email" error={fieldErrors.secondary_email}>
              <input
                id="secondary_email"
                name="secondary_email"
                type="email"
                defaultValue={defaults.secondary_email ?? ""}
                className="form-input"
              />
            </Field>
            <Field id="secondary_phone" label="Phone" error={fieldErrors.secondary_phone}>
              <input
                id="secondary_phone"
                name="secondary_phone"
                type="tel"
                defaultValue={defaults.secondary_phone ?? ""}
                className="form-input"
              />
            </Field>
          </div>
        </div>
      </div>

      <Field id="mailing_address" label="Mailing address" error={fieldErrors.mailing_address}>
        <textarea
          id="mailing_address"
          name="mailing_address"
          rows={2}
          defaultValue={defaults.mailing_address ?? ""}
          className="form-input"
        />
      </Field>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Notifications
        </h3>
        <div className="mt-3 space-y-2 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="notify_email"
              defaultChecked={defaults.notify_email !== false}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            Email reminders
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="notify_whatsapp"
              defaultChecked={defaults.notify_whatsapp !== false}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            WhatsApp reminders (delivered once WhatsApp is wired)
          </label>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
