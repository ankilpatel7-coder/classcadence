"use client";

export type ClassroomFieldErrors = Partial<Record<string, string>>;

export type ClassroomDefaults = {
  name?: string;
  description?: string | null;
  default_capacity?: number;
  color?: string;
};

const PRESET_COLORS = [
  "#1E3A8A",
  "#16A34A",
  "#F97316",
  "#F59E0B",
  "#EF4444",
  "#0EA5E9",
  "#A855F7",
  "#EC4899",
];

export function ClassroomFields({
  defaults,
  fieldErrors,
}: {
  defaults: ClassroomDefaults;
  fieldErrors: ClassroomFieldErrors;
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

      <Field id="description" label="Description" error={fieldErrors.description}>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={defaults.description ?? ""}
          className="form-input"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field
          id="default_capacity"
          label="Default capacity"
          hint="Max students in this room at one time (per session). Time slots can override this individually."
          error={fieldErrors.default_capacity}
          required
        >
          <input
            id="default_capacity"
            name="default_capacity"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={defaults.default_capacity ?? 8}
            className="form-input"
          />
        </Field>

        <Field id="color" label="Color" error={fieldErrors.color}>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={defaults.color ?? "#1E3A8A"}
              className="h-10 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
            />
            <p className="text-xs text-muted">
              Used on the weekly grid &amp; on attendance badges later.
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <PresetColor key={c} hex={c} />
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function PresetColor({ hex }: { hex: string }) {
  return (
    <button
      type="button"
      aria-label={`Pick color ${hex}`}
      onClick={() => {
        const el = document.getElementById("color") as HTMLInputElement | null;
        if (el) el.value = hex;
      }}
      style={{ backgroundColor: hex }}
      className="h-5 w-5 rounded-full border border-line"
    />
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
