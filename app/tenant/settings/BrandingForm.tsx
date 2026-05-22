"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Palette } from "lucide-react";
import { saveBrandingAction, type BrandingState } from "./actions";

const initialState: BrandingState = { error: null, success: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      <Palette className="h-4 w-4" />
      {pending ? "Saving…" : "Save branding"}
    </button>
  );
}

export function BrandingForm({
  defaults,
}: {
  defaults: {
    primary_color_hex: string;
    logo_url: string;
    sender_display_name: string;
  };
}) {
  const [state, formAction] = useFormState(saveBrandingAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="primary_color_hex"
            className="block text-sm font-medium text-ink"
          >
            Primary color
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="primary_color_hex"
              name="primary_color_hex"
              type="color"
              defaultValue={defaults.primary_color_hex}
              className="h-10 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
            />
            <input
              type="text"
              defaultValue={defaults.primary_color_hex}
              onChange={(e) => {
                const t = document.getElementById(
                  "primary_color_hex"
                ) as HTMLInputElement | null;
                if (t) t.value = e.target.value;
              }}
              className="form-input flex-1 font-mono text-sm"
              maxLength={7}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            Used for primary buttons and accents in your tenant area.
          </p>
        </div>

        <div>
          <label
            htmlFor="logo_url"
            className="block text-sm font-medium text-ink"
          >
            Logo URL (optional)
          </label>
          <input
            id="logo_url"
            name="logo_url"
            type="url"
            defaultValue={defaults.logo_url}
            placeholder="https://yourcdn.com/logo.png"
            className="form-input mt-1"
            maxLength={500}
          />
          <p className="mt-1 text-xs text-muted">
            Square image works best. Used on parent emails (when wired up).
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="sender_display_name"
          className="block text-sm font-medium text-ink"
        >
          Sender display name
        </label>
        <input
          id="sender_display_name"
          name="sender_display_name"
          type="text"
          defaultValue={defaults.sender_display_name}
          placeholder="e.g. Kumon - Spring Valley West"
          className="form-input mt-1"
          maxLength={120}
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          Branding saved. Refresh the page to see the new primary color throughout.
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
