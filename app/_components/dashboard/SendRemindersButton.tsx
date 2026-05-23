"use client";

import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { sendTodayRemindersAction } from "@/app/tenant/dashboard-actions";

function Inner() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      <Send className="h-4 w-4" />
      {pending ? "Sending…" : "Send today's reminders"}
    </button>
  );
}

export function SendRemindersButton() {
  return (
    <form action={sendTodayRemindersAction}>
      <Inner />
    </form>
  );
}
