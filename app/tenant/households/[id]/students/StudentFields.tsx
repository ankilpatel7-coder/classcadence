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
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="first_name" label="First name" required error={fieldErrors.first_name}>
          <input
            id="first_name"
            name="first_name"
            type="text"
            required
            maxLength={80}
            defaultValue={defaults.first_name ?? ""}
            className="form-input"
          />
        </Field>
        <Field id="last_name" label="Last name" required error={fieldErrors.last_name}>
          <input
            id="last_name"
            name="last_name"
            type="text"
            required
            maxLength={80}
            defaultValue={defaults.last_name ?? ""}
            className="form-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="dob" label="Date of birth" error={fieldErrors.dob}>
          <input
            id="dob"
            name="dob"
            type="date"
            defaultValue={defaults.dob ?? ""}
            className="form-input"
          />
        </Field>
        <Field id="grade_level" label="Grade level" error={fieldErrors.grade_level}>
          <input
            id="grade_level"
            name="grade_level"
            type="text"
            maxLength={40}
            placeholder="e.g. 5th"
            defaultValue={defaults.grade_level ?? ""}
            className="form-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field id="location_id" label="Primary location" required error={fieldErrors.location_id}>
          <select
            id="location_id"
            name="location_id"
            required
            defaultValue={defaults.location_id ?? locations[0]?.id ?? ""}
            className="form-input"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="lifecycle_status"
          label="Status"
          error={fieldErrors.lifecycle_status}
          required
        >
          <select
            id="lifecycle_status"
            name="lifecycle_status"
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
          id="internal_notes"
          name="internal_notes"
          rows={3}
          maxLength={2000}
          defaultValue={defaults.internal_notes ?? ""}
          className="form-input"
        />
      </Field>
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
