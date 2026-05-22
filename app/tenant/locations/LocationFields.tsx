"use client";

import type { TimezoneGroup } from "@/lib/timezones";

export type LocationFieldErrors = Partial<Record<string, string>>;

export type LocationDefaults = {
  name?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string;
  iana_timezone?: string;
  phone?: string | null;
  support_email?: string | null;
  max_classes_per_student_per_week?: number;
};

export function LocationFields({
  defaults,
  fieldErrors,
  timezoneGroups,
}: {
  defaults: LocationDefaults;
  fieldErrors: LocationFieldErrors;
  timezoneGroups: TimezoneGroup[];
}) {
  return (
    <div className="space-y-5">
      <Field id="name" label="Name" error={fieldErrors.name} required>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={defaults.name ?? ""}
          className="form-input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="address_line1" label="Address line 1" error={fieldErrors.address_line1}>
          <input
            id="address_line1"
            name="address_line1"
            type="text"
            defaultValue={defaults.address_line1 ?? ""}
            className="form-input"
          />
        </Field>
        <Field id="address_line2" label="Address line 2" error={fieldErrors.address_line2}>
          <input
            id="address_line2"
            name="address_line2"
            type="text"
            defaultValue={defaults.address_line2 ?? ""}
            className="form-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <Field id="city" label="City" error={fieldErrors.city}>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={defaults.city ?? ""}
            className="form-input"
          />
        </Field>
        <Field id="region" label="State / region" error={fieldErrors.region}>
          <input
            id="region"
            name="region"
            type="text"
            defaultValue={defaults.region ?? ""}
            className="form-input"
          />
        </Field>
        <Field id="postal_code" label="ZIP / postal code" error={fieldErrors.postal_code}>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            defaultValue={defaults.postal_code ?? ""}
            className="form-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id="country"
          label="Country"
          hint="2-letter code (US, CA, GB...)"
          error={fieldErrors.country}
          required
        >
          <input
            id="country"
            name="country"
            type="text"
            required
            maxLength={2}
            defaultValue={defaults.country ?? "US"}
            className="form-input uppercase"
          />
        </Field>

        <Field
          id="iana_timezone"
          label="Timezone"
          hint="The local time for this location's classes."
          error={fieldErrors.iana_timezone}
          required
        >
          <select
            id="iana_timezone"
            name="iana_timezone"
            required
            defaultValue={defaults.iana_timezone ?? "America/New_York"}
            className="form-input"
          >
            {timezoneGroups.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.zones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="phone" label="Phone" error={fieldErrors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaults.phone ?? ""}
            className="form-input"
          />
        </Field>
        <Field
          id="support_email"
          label="Support email"
          hint="Shown on parent communications."
          error={fieldErrors.support_email}
        >
          <input
            id="support_email"
            name="support_email"
            type="email"
            defaultValue={defaults.support_email ?? ""}
            className="form-input"
          />
        </Field>
      </div>

      <Field
        id="max_classes_per_student_per_week"
        label="Max classes per student per week"
        hint="Caps how many active enrollments a single student can have at this location. Used at enrollment time."
        error={fieldErrors.max_classes_per_student_per_week}
        required
      >
        <input
          id="max_classes_per_student_per_week"
          name="max_classes_per_student_per_week"
          type="number"
          min={1}
          max={20}
          required
          defaultValue={defaults.max_classes_per_student_per_week ?? 2}
          className="form-input"
        />
      </Field>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
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
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
