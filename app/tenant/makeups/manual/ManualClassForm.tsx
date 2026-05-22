"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useMemo, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { formatTimeInTimezone } from "@/lib/time";
import { createManualAttendancesAction } from "@/app/tenant/today/makeup-actions";

export type ManualStudent = {
  id: string;
  name: string;
  classroomId: string;
  classroomName: string;
  locationName: string;
};

export type ManualSessionOption = {
  id: string;
  startUtc: string;
  endUtc: string;
  tz: string;
  capacity: number;
  enrolled: number;
};

function Submit({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="btn-primary justify-center"
    >
      <UserPlus className="h-4 w-4" />
      {pending
        ? "Saving…"
        : count === 0
          ? "Pick at least one session"
          : `Add ${count} class${count === 1 ? "" : "es"}`}
    </button>
  );
}

function dayKey(utc: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

export function ManualClassForm({
  students,
  sessionsByStudent,
}: {
  students: ManualStudent[];
  sessionsByStudent: Record<string, ManualSessionOption[]>;
}) {
  const [studentId, setStudentId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const student = students.find((s) => s.id === studentId) ?? null;
  const sessions = studentId ? sessionsByStudent[studentId] ?? [] : [];

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; rows: ManualSessionOption[] }
    >();
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
    <form action={createManualAttendancesAction} className="space-y-6">
      <input type="hidden" name="student_id" value={studentId} />
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="session_ids" value={id} />
      ))}

      <section className="panel p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
          Step 1 · Student
        </p>
        <select
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setSelected(new Set());
          }}
          className="form-input"
        >
          <option value="">Pick a student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.classroomName}
            </option>
          ))}
        </select>
      </section>

      {student ? (
        <section className="space-y-3">
          <div className="rounded-md border border-line bg-bg/40 px-3 py-2 text-xs text-muted">
            Picking sessions in{" "}
            <span className="font-medium text-ink">
              {student.classroomName}
            </span>{" "}
            · {student.locationName}
          </div>

          {groups.length === 0 ? (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
              No upcoming sessions in this classroom for the next 30 days, or
              the student is already on every available session.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="panel p-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
                  {g.label}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {g.rows.map((s) => {
                    const isSelected = selected.has(s.id);
                    const isFull = s.enrolled >= s.capacity;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => !isFull && toggle(s.id)}
                        disabled={isFull}
                        className={`relative rounded-md border px-3 py-2 text-left text-xs transition ${
                          isSelected
                            ? "border-accent bg-accent text-white shadow-emboss"
                            : isFull
                              ? "cursor-not-allowed border-line bg-line/30 text-muted"
                              : "border-line bg-surface text-ink shadow-card hover:-translate-y-px hover:border-accent/40 hover:shadow-lift"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono tabular-nums">
                            {formatTimeInTimezone(s.startUtc, s.tz)}
                          </span>
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[10px] opacity-80">
                          {s.enrolled}/{s.capacity}
                          {isFull ? " · full" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit count={selected.size} />
        <Link href="/tenant/makeups" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
