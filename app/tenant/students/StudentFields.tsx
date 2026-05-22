"use client";

export type StudentFieldErrors = Partial<Record<string, string>>;

export type LocationOption = { id: string; name: string };

export type StudentDefaults = {
  first_name?: string;
  last_name?: string;
  dob?: string | null;
  grade_level?: string | null;
  lifecycle_status?: string;
  internal_notes?: string | null;
  location_id?: string;
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

export function StudentFields({
  defaults,
  fieldErrors,
  locations,
}: {
  defaults: StudentDefaults;
  fieldErrors: StudentFieldErrors;
  locations: LocationOption[];
}) {
  const hasSecondary = Boolean(
    defaults.secondary_parent_name ||
      defaults.secondary_email ||
      defaults.secondary_phone ||
      defaults.mailing_address
  );
  return (
    <div className="space-y-5">
      {/* Student */}
      <section className="space-y-3">
        <h3 className="section-eyebrow">Student</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field id="first_name" label="First name" required error={fieldErrors.first_name}>
            <input
              id="first_name" name="first_name" type="text"
              required maxLength={80}
              defaultValue={defaults.first_name ?? ""}
              className="form-input"
            />
          </Field>
          <Field id="last_name" label="Last name" required error={fieldErrors.last_name}>
            <input
              id="last_name" name="last_name" type="text"
              required maxLength={80}
              defaultValue={defaults.last_name ?? ""}
              className="form-input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field id="dob" label="Date of birth" error={fieldErrors.dob}>
            <input
              id="dob" name="dob" type="date"
              defaultValue={defaults.dob ?? ""}
              className="form-input"
            />
          </Field>
          <Field id="grade_level" label="Grade level" error={fieldErrors.grade_level}>
            <input
              id="grade_level" name="grade_level" type="text"
              maxLength={40} placeholder="e.g. 5th"
              defaultValue={defaults.grade_level ?? ""}
              className="form-input"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field id="location_id" label="Primary location" required error={fieldErrors.location_id}>
            <select
              id="location_id" name="location_id" required
              defaultValue={defaults.location_id ?? locations[0]?.id ?? ""}
              className="form-input"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
          <Field id="lifecycle_status" label="Status" required error={fieldErrors.lifecycle_status}>
            <select
              id="lifecycle_status" name="lifecycle_status"
              defaultValue={defaults.lifecycle_status ?? "active"}
              className="form-input"
            >
              <option value="lead">Lead</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="waitlist">Waitlist</option>
              <option value="inactive">Inactive</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </Field>
        </div>

        <Field id="internal_notes" label="Internal notes" error={fieldErrors.internal_notes}>
          <textarea
            id="internal_notes" name="internal_notes" rows={2} maxLength={2000}
            defaultValue={defaults.internal_notes ?? ""}
            className="form-input"
          />
        </Field>
      </section>

      {/* Primary parent */}
      <section className="space-y-3">
        <h3 className="section-eyebrow">Primary parent / guardian</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            id="primary_parent_name" label="Name" required
            error={fieldErrors.primary_parent_name}
          >
            <input
              id="primary_parent_name" name="primary_parent_name" type="text"
              required maxLength={120}
              defaultValue={defaults.primary_parent_name ?? ""}
              className="form-input"
            />
          </Field>
          <Field id="primary_email" label="Email" error={fieldErrors.primary_email}>
            <input
              id="primary_email" name="primary_email" type="email"
              defaultValue={defaults.primary_email ?? ""}
              className="form-input"
            />
          </Field>
          <Field id="primary_phone" label="Phone" error={fieldErrors.primary_phone}>
            <input
              id="primary_phone" name="primary_phone" type="tel"
              defaultValue={defaults.primary_phone ?? ""}
              className="form-input"
            />
          </Field>
        </div>
        <p className="text-xs text-muted">
          At least one of email or phone is required for notifications.
        </p>
      </section>

      {/* Optional sections — collapsed by default to keep the form short */}
      <details className="group rounded-md border border-line bg-bg/30 px-3 py-2 open:bg-bg/50" open={hasSecondary}>
        <summary className="cursor-pointer list-none text-xs font-medium text-muted transition hover:text-ink">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary group-open:bg-primary-strong" />
            More details · secondary parent, mailing, notifications
          </span>
        </summary>

        <div className="mt-3 space-y-5">
          {/* Secondary parent */}
          <section className="space-y-3">
            <h3 className="section-eyebrow">Secondary parent (optional)</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field
                id="secondary_parent_name" label="Name"
                error={fieldErrors.secondary_parent_name}
              >
                <input
                  id="secondary_parent_name" name="secondary_parent_name" type="text" maxLength={120}
                  defaultValue={defaults.secondary_parent_name ?? ""}
                  className="form-input"
                />
              </Field>
              <Field id="secondary_email" label="Email" error={fieldErrors.secondary_email}>
                <input
                  id="secondary_email" name="secondary_email" type="email"
                  defaultValue={defaults.secondary_email ?? ""}
                  className="form-input"
                />
              </Field>
              <Field id="secondary_phone" label="Phone" error={fieldErrors.secondary_phone}>
                <input
                  id="secondary_phone" name="secondary_phone" type="tel"
                  defaultValue={defaults.secondary_phone ?? ""}
                  className="form-input"
                />
              </Field>
            </div>
          </section>

          {/* Mailing + notifications */}
          <section className="space-y-3">
            <h3 className="section-eyebrow">Mailing &amp; notifications</h3>
            <Field id="mailing_address" label="Mailing address" error={fieldErrors.mailing_address}>
              <textarea
                id="mailing_address" name="mailing_address" rows={2}
                defaultValue={defaults.mailing_address ?? ""}
                className="form-input"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox" name="notify_email"
                  defaultChecked={defaults.notify_email !== false}
                  className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                />
                Email reminders
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox" name="notify_whatsapp"
                  defaultChecked={defaults.notify_whatsapp !== false}
                  className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                />
                WhatsApp reminders <span className="text-xs text-muted">(when wired)</span>
              </label>
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}

function Field({
  id, label, error, required, children,
}: {
  id: string; label: string; error?: string; required?: boolean; children: React.ReactNode;
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
