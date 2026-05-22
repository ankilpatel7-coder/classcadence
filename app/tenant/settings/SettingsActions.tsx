"use client";

import { useFormStatus } from "react-dom";
import {
  Database,
  RefreshCcw,
  Sparkles,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  seedDemoDataAction,
  wipeAllTenantDataAction,
  wipeDemoDataAction,
} from "./actions";
import { materializeSessionsAction } from "@/app/tenant/today/actions";

function PendingButton({
  label,
  pendingLabel,
  icon: Icon,
  className,
  confirmText,
}: {
  label: string;
  pendingLabel: string;
  icon: typeof Sparkles;
  className: string;
  confirmText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition active:translate-y-0 disabled:opacity-60 ${className}`}
    >
      <Icon className="h-4 w-4" />
      {pending ? pendingLabel : label}
    </button>
  );
}

export function RefreshScheduleButton() {
  return (
    <form action={materializeSessionsAction}>
      <PendingButton
        label="Force refresh schedule"
        pendingLabel="Refreshing…"
        icon={RefreshCcw}
        className="bg-bg/70 text-ink ring-1 ring-inset ring-line/70 hover:-translate-y-px hover:bg-bg hover:ring-line"
      />
    </form>
  );
}

export function SeedDemoButton() {
  return (
    <form action={seedDemoDataAction}>
      <PendingButton
        label="Seed demo data"
        pendingLabel="Seeding…"
        icon={Sparkles}
        className="bg-accent text-white shadow-emboss hover:-translate-y-px hover:brightness-110"
        confirmText="Add ~4 demo households + ~7 students enrolled in your existing time slots, plus materialize 14 days of sessions. Proceed?"
      />
    </form>
  );
}

export function WipeDemoButton() {
  return (
    <form action={wipeDemoDataAction}>
      <PendingButton
        label="Wipe demo data only"
        pendingLabel="Wiping…"
        icon={Trash2}
        className="bg-bg/70 text-ink ring-1 ring-inset ring-line/70 hover:-translate-y-px hover:bg-bg hover:ring-line"
        confirmText="Delete every household + student tagged 'classcadence:demo' (along with their enrollments + attendance)?"
      />
    </form>
  );
}

export function WipeAllButton() {
  return (
    <form action={wipeAllTenantDataAction}>
      <PendingButton
        label="Wipe ALL students & households"
        pendingLabel="Wiping…"
        icon={AlertTriangle}
        className="bg-danger/10 text-danger ring-1 ring-inset ring-danger/15 hover:-translate-y-px hover:bg-danger/15 hover:ring-danger/25"
        confirmText="This deletes EVERY household, student, enrollment, and attendance record for this tenant. Locations, classrooms, and time slots are kept. Are you sure?"
      />
    </form>
  );
}

export function DatabaseLink() {
  return (
    <a
      href="https://supabase.com/dashboard/project/_/database/usage"
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary"
    >
      <Database className="h-4 w-4" />
      Open Supabase usage page
    </a>
  );
}
