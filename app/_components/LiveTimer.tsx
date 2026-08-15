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
      className={`inline-flex items-center gap-2.5 rounded-xl px-3.5 py-2 font-mono text-2xl font-extrabold leading-none tabular-nums shadow-emboss ring-2 ring-surface md:px-4 md:text-3xl ${
        until ? "bg-bg text-muted" : "text-white"
      }`}
      // Matches the Check in button's gradient so a running timer reads as the
      // same "live / present" green.
      style={
        until
          ? undefined
          : {
              backgroundImage:
                "linear-gradient(180deg, #2BC98A 0%, #16A34A 55%, #0B6845 100%)",
            }
      }
      title={until ? "Session length" : "Time since check-in"}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          until ? "bg-muted" : "animate-pulse bg-white/90"
        }`}
      />
      {display}
    </span>
  );
}
