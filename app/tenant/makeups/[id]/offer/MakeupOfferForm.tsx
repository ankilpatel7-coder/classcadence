"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { formatTimeInTimezone } from "@/lib/time";
import { createMakeupAttendancesAction } from "@/app/tenant/today/makeup-actions";

export type SessionOption = {
  id: string;
  startUtc: string;
  endUtc: string;
  tz: string;
  capacity: number;
  enrolled: number;
  isStudentIn: boolean;
};

function Submit({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="btn-primary justify-center"
    >
      <Sparkles className="h-4 w-4" />
      {pending
        ? "Saving…"
        : count === 0
          ? "Pick at least one session"
          : `Add ${count} make-up class${count === 1 ? "" : "es"}`}
    </button>
  );
}

function dayKey(utc: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(utc));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function dayLabel(utc: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(utc));
}

export function MakeupOfferForm({
  attendanceId,
  sessions,
}: {
  attendanceId: string;
  studentName: string;
  tz: string;
  sessions: SessionOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Group sessions by day for cleaner picking.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; rows: SessionOption[] }>();
    for (const s of sessions) {
      const key = dayKey(s.startUtc, s.tz);
      const label = dayLabel(s.startUtc, s.tz);
      const g = map.get(key) ?? { label, rows: [] };
      g.rows.push(s);
      map.set(key, g);
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [sessions]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={createMakeupAttendancesAction} className="space-y-4">
      <input type="hidden" name="absent_attendance_id" value={attendanceId} />
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="session_ids" value={id} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Selected:{" "}
          <span className="font-mono text-ink">{selected.size}</span>{" "}
          class{selected.size === 1 ? "" : "es"}
        </p>
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.key} className="panel p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
              {g.label}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {g.rows.map((s) => {
                const isSelected = selected.has(s.id);
                const isFull = s.enrolled >= s.capacity;
                const disabled = isFull || s.isStudentIn;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => !disabled && toggle(s.id)}
                    disabled={disabled}
                    className={`relative rounded-md border px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? "border-primary bg-primary text-white shadow-emboss"
                        : disabled
                          ? "cursor-not-allowed border-line bg-line/30 text-muted"
                          : "border-line bg-surface text-ink shadow-card hover:-translate-y-px hover:border-primary/40 hover:shadow-lift"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundImage:
                              "linear-gradient(135deg, #2BC98A 0%, var(--color-primary) 60%, var(--color-primary-strong) 100%)",
                          }
                        : undefined
                    }
                    title={
                      s.isStudentIn
                        ? "Student is already on this session"
                        : isFull
                          ? "Session is full"
                          : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono tabular-nums">
                        {formatTimeInTimezone(s.startUtc, s.tz)}
                      </span>
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    </div>
                    <p className="mt-1 text-[10px] opacity-80">
                      {s.enrolled}/{s.capacity}
                      {s.isStudentIn ? " · already in" : ""}
                      {isFull && !s.isStudentIn ? " · full" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Submit count={selected.size} />
        <Link
          href="/tenant/makeups"
          className="btn-secondary"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
