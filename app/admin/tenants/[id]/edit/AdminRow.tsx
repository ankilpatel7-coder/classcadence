"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import {
  updateAdminProfileAction,
  removeAdminAction,
  resetAdminPasswordAction,
  type UpdateAdminState,
  type ResetPasswordState,
} from "../../actions";

type Admin = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

const initialState: UpdateAdminState = { error: null, success: false };
const initialPwState: ResetPasswordState = {
  error: null,
  success: false,
  credentials: null,
};

function generatePassword(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-secondary !px-3 !py-1.5"
    >
      {pending ? "Saving…" : "Save name"}
    </button>
  );
}

function SetPasswordButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !px-3 !py-1.5">
      {pending ? "Setting…" : "Set password"}
    </button>
  );
}

function RemoveButton({ adminEmail }: { adminEmail: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (
          !window.confirm(
            `Remove "${adminEmail}" as an admin? This deletes their login ` +
              `account entirely — they will no longer be able to sign in. ` +
              `You can invite them again afterwards.`
          )
        ) {
          event.preventDefault();
        }
      }}
      className="btn-danger !px-3 !py-1.5"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function AdminRow({
  admin,
  tenantId,
}: {
  admin: Admin;
  tenantId: string;
}) {
  const [state, formAction] = useFormState(updateAdminProfileAction, initialState);
  const [pwState, pwAction] = useFormState(resetAdminPasswordAction, initialPwState);
  const [showPwForm, setShowPwForm] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const pwFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pwState.success) {
      pwFormRef.current?.reset();
      setPasswordValue("");
    }
  }, [pwState.success]);

  return (
    <div className="rounded-md border border-line bg-bg/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{admin.email}</p>
          <p className="text-xs text-muted">
            Added {new Date(admin.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPwForm((v) => !v)}
            className="btn-secondary !px-3 !py-1.5"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {showPwForm ? "Cancel" : "Set password"}
          </button>
          <form action={removeAdminAction}>
            <input type="hidden" name="admin_id" value={admin.id} />
            <input type="hidden" name="tenant_id" value={tenantId} />
            <RemoveButton adminEmail={admin.email} />
          </form>
        </div>
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="admin_id" value={admin.id} />
        <input type="hidden" name="tenant_id" value={tenantId} />

        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor={`full_name_${admin.id}`}
            className="block text-xs font-medium text-muted"
          >
            Full name
          </label>
          <input
            id={`full_name_${admin.id}`}
            name="full_name"
            type="text"
            defaultValue={admin.full_name ?? ""}
            maxLength={120}
            className="form-input mt-1"
          />
        </div>

        <SaveButton />
      </form>

      {state.error ? (
        <p className="mt-2 text-xs text-danger">{state.error}</p>
      ) : state.success ? (
        <p className="mt-2 text-xs text-success">Saved.</p>
      ) : null}

      {showPwForm ? (
        <div className="mt-4 rounded-md border border-line bg-surface p-4">
          <p className="text-xs text-muted">
            Set a new sign-in password for this admin. Works even if they never
            had a login yet (e.g. a migrated account). Share it out-of-band — they
            can change it after signing in.
          </p>
          <form ref={pwFormRef} action={pwAction} className="mt-3 space-y-3">
            <input type="hidden" name="admin_id" value={admin.id} />
            <input type="hidden" name="tenant_id" value={tenantId} />

            <div className="flex items-stretch gap-2">
              <input
                name="password"
                type={revealPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={72}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                autoComplete="new-password"
                placeholder="New password"
                className="form-input flex-1"
              />
              <button
                type="button"
                onClick={() => setRevealPassword((v) => !v)}
                className="btn-secondary !px-3 !py-1.5"
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
                className="btn-secondary !px-3 !py-1.5"
              >
                Generate
              </button>
            </div>

            <SetPasswordButton />
          </form>

          {pwState.error ? (
            <p className="mt-2 text-xs text-danger">{pwState.error}</p>
          ) : null}
          {pwState.success && pwState.credentials ? (
            <CredentialsBanner
              email={pwState.credentials.email}
              password={pwState.credentials.password}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CredentialsBanner({ email, password }: { email: string; password: string }) {
  function copyAll() {
    void navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
  }
  return (
    <div className="mt-3 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-ink">
      <p className="font-medium text-success">Password set.</p>
      <p className="mt-1 text-xs text-muted">
        Share these credentials with the admin out-of-band. They won&apos;t see
        them again — once they sign in, they can change the password.
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
        className="btn-secondary mt-3 !px-3 !py-1.5"
      >
        Copy both
      </button>
    </div>
  );
}
