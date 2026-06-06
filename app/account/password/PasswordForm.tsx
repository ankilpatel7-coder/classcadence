"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Check } from "lucide-react";
import { authClient } from "@/lib/auth/client";

type FieldErrors = Record<string, string>;

export function PasswordForm() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealNew, setRevealNew] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const current = String(form.get("current_password") ?? "");
    const next = String(form.get("new_password") ?? "");
    const confirm = String(form.get("confirm_password") ?? "");

    const fe: FieldErrors = {};
    if (next.length < 8) fe.new_password = "Password must be at least 8 characters.";
    if (next !== confirm) fe.confirm_password = "Passwords don't match.";
    if (current && next && current === next)
      fe.new_password = "New password must be different from your current one.";
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }

    setPending(true);
    const { error: changeError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
    });
    setPending(false);

    if (changeError) {
      // Better Auth returns INVALID_PASSWORD when the current password is wrong.
      if (changeError.code === "INVALID_PASSWORD") {
        setFieldErrors({ current_password: "Current password is incorrect." });
      } else {
        setError(changeError.message ?? "Could not update password.");
      }
      return;
    }

    setSuccess(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordField
        id="current_password"
        label="Current password"
        autoComplete="current-password"
        reveal={revealCurrent}
        onToggleReveal={() => setRevealCurrent((v) => !v)}
        error={fieldErrors.current_password}
      />
      <PasswordField
        id="new_password"
        label="New password"
        autoComplete="new-password"
        reveal={revealNew}
        onToggleReveal={() => setRevealNew((v) => !v)}
        hint="At least 8 characters."
        error={fieldErrors.new_password}
      />
      <PasswordField
        id="confirm_password"
        label="Confirm new password"
        autoComplete="new-password"
        reveal={revealNew}
        onToggleReveal={() => setRevealNew((v) => !v)}
        error={fieldErrors.confirm_password}
      />

      {error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="inline-flex items-center gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          <Check className="h-4 w-4" />
          Password updated. Your next sign-in will use the new one.
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-primary">
        <KeyRound className="h-4 w-4" />
        {pending ? "Updating…" : "Update password"}
      </button>
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
