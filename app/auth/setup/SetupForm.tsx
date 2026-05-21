"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  initialFullName: string;
};

export function SetupForm({ email, initialFullName }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName.trim() || undefined },
    });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // The user is already signed in (the invite callback set their session).
    // Send them into the tenant area; the layout there reads role & tenant_id.
    router.push("/tenant");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink">Email</label>
        <input value={email} disabled className="form-input mt-1 bg-bg text-muted" />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-ink">
          Your name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="form-input mt-1"
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="form-input mt-1"
        />
        <p className="mt-1 text-xs text-muted">Minimum 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-ink">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="form-input mt-1"
        />
      </div>

      {error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set password and continue"}
      </button>
    </form>
  );
}
