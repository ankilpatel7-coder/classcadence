"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  createAdminWithPasswordAction,
  inviteAdminAction,
  type InviteAdminState,
} from "../../actions";

const initialState: InviteAdminState = {
  error: null,
  success: false,
  createdCredentials: null,
};

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function InviteAdminForm({ tenantId }: { tenantId: string }) {
  const [mode, setMode] = useState<"email" | "password">("email");
  const [emailState, emailAction] = useFormState(inviteAdminAction, initialState);
  const [pwState, pwAction] = useFormState(createAdminWithPasswordAction, initialState);
  const emailFormRef = useRef<HTMLFormElement>(null);
  const pwFormRef = useRef<HTMLFormElement>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);

  useEffect(() => {
    if (emailState.success) emailFormRef.current?.reset();
  }, [emailState.success]);

  useEffect(() => {
    if (pwState.success) {
      pwFormRef.current?.reset();
      setPasswordValue("");
    }
  }, [pwState.success]);

  return (
    <div className="space-y-4">
      <div
        role="radiogroup"
        aria-label="Invite mode"
        className="inline-flex rounded-md border border-line bg-bg/50 p-1 text-xs"
      >
        <ModeButton active={mode === "email"} onClick={() => setMode("email")}>
          Send invite email
        </ModeButton>
        <ModeButton active={mode === "password"} onClick={() => setMode("password")}>
          Set initial password
        </ModeButton>
      </div>

      {mode === "email" ? (
        <form ref={emailFormRef} action={emailAction} className="space-y-3">
          <input type="hidden" name="tenant_id" value={tenantId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldShell id="invite_name" label="Full name (optional)">
              <input
                id="invite_name"
                name="full_name"
                type="text"
                maxLength={120}
                className="form-input mt-1"
              />
            </FieldShell>
            <FieldShell id="invite_email" label="Email">
              <input
                id="invite_email"
                name="email"
                type="email"
                required
                className="form-input mt-1"
              />
            </FieldShell>
          </div>

          {emailState.error ? (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
              {emailState.error}
            </p>
          ) : null}
          {emailState.success ? (
            <p className="rounded-md bg-success-soft px-3 py-2 text-xs text-success">
              Invite sent. They&apos;ll receive an email with a link to set their password.
            </p>
          ) : null}

          <Submit label="Send invite" pendingLabel="Sending…" />
        </form>
      ) : (
        <form ref={pwFormRef} action={pwAction} className="space-y-3">
          <input type="hidden" name="tenant_id" value={tenantId} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldShell id="pw_name" label="Full name (optional)">
              <input
                id="pw_name"
                name="full_name"
                type="text"
                maxLength={120}
                className="form-input mt-1"
              />
            </FieldShell>
            <FieldShell id="pw_email" label="Email">
              <input
                id="pw_email"
                name="email"
                type="email"
                required
                className="form-input mt-1"
              />
            </FieldShell>
          </div>

          <FieldShell id="pw_password" label="Initial password" hint="Minimum 8 characters. Share this with the admin out-of-band.">
            <div className="mt-1 flex items-stretch gap-2">
              <input
                id="pw_password"
                name="password"
                type={revealPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={72}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                autoComplete="new-password"
                className="form-input flex-1"
              />
              <button
                type="button"
                onClick={() => setRevealPassword((v) => !v)}
                className="rounded-md border border-line bg-surface px-3 text-xs text-ink transition hover:bg-bg"
              >
                {revealPassword ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = generatePassword();
                  setPasswordValue(next);
                  setRevealPassword(true);
                }}
                className="rounded-md border border-line bg-surface px-3 text-xs text-ink transition hover:bg-bg"
              >
                Generate
              </button>
            </div>
          </FieldShell>

          {pwState.error ? (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
              {pwState.error}
            </p>
          ) : null}
          {pwState.success && pwState.createdCredentials ? (
            <CredentialsBanner
              email={pwState.createdCredentials.email}
              password={pwState.createdCredentials.password}
            />
          ) : null}

          <Submit label="Create account" pendingLabel="Creating…" />
        </form>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 transition ${
        active
          ? "bg-surface font-medium text-ink shadow-card"
          : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FieldShell({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function CredentialsBanner({ email, password }: { email: string; password: string }) {
  function copyAll() {
    void navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
  }
  return (
    <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-ink">
      <p className="font-medium text-success">Account created.</p>
      <p className="mt-1 text-xs text-muted">
        Share these credentials with the admin out-of-band (WhatsApp, text, in person).
        They won&apos;t see them again — once they sign in, they can change the password.
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 text-xs uppercase tracking-wider text-muted">Email</dt>
          <dd className="font-mono text-ink">{email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 text-xs uppercase tracking-wider text-muted">Password</dt>
          <dd className="font-mono text-ink">{password}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={copyAll}
        className="mt-3 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-bg"
      >
        Copy both
      </button>
    </div>
  );
}
