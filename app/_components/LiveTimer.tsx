"use client";

import { useEffect, useState } from "react";

// Ticking elapsed-time display. `since` is an ISO timestamp; we count up from
// it once per second on the client. Used to show how long a student has been
// checked into a session.
export function LiveTimer({
  since,
  until,
}: {
  since: string;
  until?: string | null;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    // If they've checked out, freeze on the check-out instant; no need to tick.
    if (until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);

  const startMs = new Date(since).getTime();
  const endMs = until ? new Date(until).getTime() : now;
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const display =
    h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums shadow-emboss ${
        until
          ? "bg-bg/60 text-muted"
          : "bg-success-soft text-success"
      }`}
      title={until ? "Session length" : "Time since check-in"}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          until ? "bg-muted" : "bg-success animate-pulse"
        }`}
      />
      {display}
    </span>
  );
}
