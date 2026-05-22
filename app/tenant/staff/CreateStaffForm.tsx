"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { createStaffAction, type CreateStaffState } from "./actions";

const initialState: CreateStaffState = {
  error: null,
  success: false,
  createdCredentials: null,
};

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Creating…" : "Create staff account"}
    </button>
  );
}

export function CreateStaffForm() {
  const [state, formAction] = useFormState(createStaffAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setPassword("");
      setReveal(false);
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FieldShell id="staff_name" label="Full name">
          <input
            id="staff_name"
            name="full_name"
            type="text"
            maxLength={120}
            className="form-input mt-1"
          />
        </FieldShell>
        <FieldShell id="staff_email" label="Email">
          <input
            id="staff_email"
            name="email"
            type="email"
            required
            className="form-input mt-1"
          />
        </FieldShell>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FieldShell id="staff_role" label="Role" hint="What this user can do.">
          <select
            id="staff_role"
            name="role"
            defaultValue="front_desk"
            className="form-input mt-1"
          >
            <option value="front_desk">Front Desk</option>
            <option value="location_admin">Location Admin</option>
          </select>
        </FieldShell>
        <FieldShell
          id="staff_password"
          label="Initial password"
          hint="Share with the staff member out-of-band. They can change it later."
        >
          <div className="mt-1 flex items-stretch gap-2">
            <input
              id="staff_password"
              name="password"
              type={reveal ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="form-input flex-1"
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="btn-secondary !px-3 !py-1.5"
            >
              {reveal ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPassword(generatePassword());
                setReveal(true);
              }}
              className="btn-secondary !px-3 !py-1.5"
            >
              Generate
            </button>
          </div>
        </FieldShell>
      </div>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success && state.createdCredentials ? (
        <CredentialsBanner credentials={state.createdCredentials} />
      ) : null}

      <Submit />
    </form>
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

function CredentialsBanner({
  credentials,
}: {
  credentials: { email: string; password: string; role: string };
}) {
  function copyAll() {
    void navigator.clipboard.writeText(
      `Email: ${credentials.email}\nPassword: ${credentials.password}\nRole: ${credentials.role}`
    );
  }
  return (
    <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-ink">
      <p className="font-medium text-success">Staff account created.</p>
      <p className="mt-1 text-xs text-muted">
        Share these credentials out-of-band. The new user can sign in at /login
        and change their password later.
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        <Row label="Email" value={credentials.email} mono />
        <Row label="Password" value={credentials.password} mono />
        <Row label="Role" value={credentials.role} />
      </dl>
      <button
        type="button"
        onClick={copyAll}
        className="btn-secondary mt-3 !px-3 !py-1.5"
      >
        Copy credentials
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className={mono ? "font-mono text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}
