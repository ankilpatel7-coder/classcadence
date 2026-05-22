"use client";

import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { offerMakeupAction } from "./makeup-actions";

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-surface px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary-soft/60 disabled:opacity-60"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {pending ? "Offering…" : "Offer make-up"}
    </button>
  );
}

export function OfferMakeupButton({ attendanceId }: { attendanceId: string }) {
  return (
    <form action={offerMakeupAction}>
      <input type="hidden" name="attendance_id" value={attendanceId} />
      <Inner />
    </form>
  );
}
