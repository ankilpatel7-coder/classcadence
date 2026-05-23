"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff, KeyRound, Check } from "lucide-react";
import { changePasswordAction, type PasswordState } from "./actions";

const initial: PasswordState = { error: null, fieldErrors: {}, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      <KeyRound className="h-4 w-4" />
      {pending ? "Updating…" : "Update password"}
    </button>
  );
}

export function PasswordForm() {
  const [state, formAction] = useFormState(changePasswordAction, initial);
  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealNew, setRevealNew] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <PasswordField
        id="current_password"
        label="Current password"
        autoComplete="current-password"
        reveal={revealCurrent}
        onToggleReveal={() => setRevealCurrent((v) => !v)}
        error={state.fieldErrors.current_password}
      />
      <PasswordField
        id="new_password"
        label="New password"
        autoComplete="new-password"
        reveal={revealNew}
        onToggleReveal={() => setRevealNew((v) => !v)}
        hint="At least 8 characters."
        error={state.fieldErrors.new_password}
      />
      <PasswordField
        id="confirm_password"
        label="Confirm new password"
        autoComplete="new-password"
        reveal={revealNew}
        onToggleReveal={() => setRevealNew((v) => !v)}
        error={state.fieldErrors.confirm_password}
      />

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="inline-flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          <Check className="h-4 w-4" />
          Password updated. Your next sign-in will use the new one.
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  reveal,
  onToggleReveal,
  hint,
  error,
}: {
  id: string;
  label: string;
  autoComplete: string;
  reveal: boolean;
  onToggleReveal: () => void;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          name={id}
          type={reveal ? "text" : "password"}
          required
          minLength={id === "current_password" ? undefined : 8}
          maxLength={72}
          autoComplete={autoComplete}
          className="form-input flex-1"
        />
        <button
          type="button"
          onClick={onToggleReveal}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="btn-secondary !px-2.5 !py-1.5"
        >
          {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
