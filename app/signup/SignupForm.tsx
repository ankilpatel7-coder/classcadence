"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Check, MailCheck } from "lucide-react";
import { submitSignupAction, type SignupState } from "./actions";

const initial: SignupState = { error: null, fieldErrors: {}, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 rounded-md text-white font-semibold uppercase tracking-[0.08em] text-sm transition hover:-translate-y-px disabled:opacity-60"
      style={{
        backgroundImage:
          "linear-gradient(180deg, #FDBA74 0%, var(--color-accent) 55%, #C2410C 100%)",
        boxShadow:
          "0 4px 8px rgba(15,23,42,0.1), 0 16px 32px -10px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
      }}
    >
      {pending ? "Sending…" : "Send Request"}
      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState(submitSignupAction, initial);

  if (state.success) {
    return (
      <div className="text-center">
        <div
          className="inline-flex h-16 w-16 items-center justify-center rounded-full mb-5"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #2BC98A 0%, var(--color-primary) 55%, var(--color-primary-strong) 100%)",
            boxShadow:
              "0 4px 8px rgba(15,23,42,0.1), 0 16px 32px -10px rgba(11,104,69,0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <Check className="h-7 w-7 text-white" strokeWidth={3} />
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold uppercase text-primary leading-[1.1] tracking-[-0.015em]">
          Thanks — We&apos;ll Be In Touch.
        </h2>
        <p className="mt-4 text-base text-ink/70 leading-relaxed max-w-md mx-auto">
          We received your details and a confirmation email is on its way to your inbox. Someone from our team will reach out shortly to get your center set up.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-primary-strong hover:underline"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="full_name" label="Your name" required error={state.fieldErrors.full_name}>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            className="form-input"
          />
        </Field>
        <Field id="email" label="Work email" required error={state.fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            className="form-input"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="organization" label="Learning center" required error={state.fieldErrors.organization}>
          <input
            id="organization"
            name="organization"
            type="text"
            required
            maxLength={160}
            autoComplete="organization"
            placeholder="e.g. Spring Valley Kumon"
            className="form-input"
          />
        </Field>
        <Field id="phone" label="Phone" error={state.fieldErrors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            placeholder="Optional"
            className="form-input"
          />
        </Field>
      </div>
      <Field id="message" label="Anything we should know?" error={state.fieldErrors.message}>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={2000}
          placeholder="Number of students, locations, current tools — anything that helps us help you."
          className="form-input"
        />
      </Field>

      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-xs text-muted flex items-center justify-center gap-1.5">
        <MailCheck className="h-3 w-3" />
        We&apos;ll only use your email to follow up — no spam.
      </p>
    </form>
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
      <label
        htmlFor={id}
        className="block text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70"
      >
        {label}
        {required ? <span className="ml-1 text-accent">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
