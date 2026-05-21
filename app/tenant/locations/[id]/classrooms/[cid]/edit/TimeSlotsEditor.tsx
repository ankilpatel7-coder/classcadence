"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveTimeSlotsAction, type TimeSlotsState } from "../../actions";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export type Slot = {
  weekday: Weekday;
  start_time: string;
  end_time: string;
  capacity_override: number | null;
  notes: string | null;
};

export type HoursWindow = {
  weekday: Weekday;
  open_time: string;
  close_time: string;
};

type State = Record<Weekday, Slot[]>;

function emptyState(): State {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

function buildInitial(slots: Slot[]): State {
  const s = emptyState();
  for (const slot of slots) s[slot.weekday].push(slot);
  for (const k of Object.keys(s) as Weekday[]) {
    s[k].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }
  return s;
}

function dayHasOperatingHours(day: Weekday, hours: HoursWindow[]) {
  return hours.some((h) => h.weekday === day);
}

function dayHoursLabel(day: Weekday, hours: HoursWindow[]) {
  const windows = hours.filter((h) => h.weekday === day);
  if (windows.length === 0) return "Closed (no operating hours)";
  return windows
    .map((w) => `${w.open_time.slice(0, 5)}–${w.close_time.slice(0, 5)}`)
    .join(", ");
}

export function TimeSlotsEditor({
  classroomId,
  locationId,
  defaultCapacity,
  initialSlots,
  operatingHours,
}: {
  classroomId: string;
  locationId: string;
  defaultCapacity: number;
  initialSlots: Slot[];
  operatingHours: HoursWindow[];
}) {
  const [state, setState] = useState<State>(() => buildInitial(initialSlots));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const flatSlots = useMemo(() => {
    const out: Slot[] = [];
    for (const day of WEEKDAYS) out.push(...state[day.key]);
    return out;
  }, [state]);

  function addSlot(day: Weekday) {
    setState((prev) => ({
      ...prev,
      [day]: [
        ...prev[day],
        {
          weekday: day,
          start_time: "16:00",
          end_time: "17:00",
          capacity_override: null,
          notes: null,
        },
      ],
    }));
  }

  function removeSlot(day: Weekday, index: number) {
    setState((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  }

  function updateSlot<K extends keyof Slot>(
    day: Weekday,
    index: number,
    field: K,
    value: Slot[K]
  ) {
    setState((prev) => ({
      ...prev,
      [day]: prev[day].map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side checks mirror the server-side ones for fast feedback.
    for (const s of flatSlots) {
      if (s.end_time <= s.start_time) {
        setError(`End time must be after start time (${s.weekday.toUpperCase()}).`);
        return;
      }
    }
    for (let i = 0; i < flatSlots.length; i++) {
      for (let j = i + 1; j < flatSlots.length; j++) {
        const a = flatSlots[i];
        const b = flatSlots[j];
        if (
          a.weekday === b.weekday &&
          a.start_time < b.end_time &&
          b.start_time < a.end_time
        ) {
          setError(
            `Overlapping slots on ${a.weekday.toUpperCase()}: ` +
              `${a.start_time}–${a.end_time} and ${b.start_time}–${b.end_time}.`
          );
          return;
        }
      }
    }

    const formData = new FormData();
    formData.set("classroom_id", classroomId);
    formData.set("location_id", locationId);
    formData.set("slots", JSON.stringify(flatSlots));

    setPending(true);
    const result: TimeSlotsState = await saveTimeSlotsAction(
      { error: null, success: false },
      formData
    );
    setPending(false);

    if (result.error) setError(result.error);
    else setSuccess(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        {WEEKDAYS.map((day) => {
          const slots = state[day.key];
          const hasHours = dayHasOperatingHours(day.key, operatingHours);
          return (
            <div
              key={day.key}
              className="rounded-md border border-line bg-bg/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{day.label}</p>
                  <p className="text-xs text-muted">
                    Location hours: {dayHoursLabel(day.key, operatingHours)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addSlot(day.key)}
                  disabled={!hasHours}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
                  title={
                    hasHours
                      ? "Add a time slot"
                      : "Set operating hours for this day first"
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add slot
                </button>
              </div>

              {slots.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {slots.map((s, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-line bg-surface px-3 py-2"
                    >
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-[auto_auto_auto_1fr_auto]">
                        <input
                          type="time"
                          required
                          value={s.start_time}
                          onChange={(e) =>
                            updateSlot(day.key, i, "start_time", e.target.value)
                          }
                          className="form-input w-28"
                        />
                        <span className="self-center text-xs text-muted">to</span>
                        <input
                          type="time"
                          required
                          value={s.end_time}
                          onChange={(e) =>
                            updateSlot(day.key, i, "end_time", e.target.value)
                          }
                          className="form-input w-28"
                        />
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={s.capacity_override ?? ""}
                          onChange={(e) =>
                            updateSlot(
                              day.key,
                              i,
                              "capacity_override",
                              e.target.value === "" ? null : Number(e.target.value)
                            )
                          }
                          placeholder={`Cap (default ${defaultCapacity})`}
                          className="form-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeSlot(day.key, i)}
                          aria-label="Remove slot"
                          className="inline-flex items-center justify-center rounded-md border border-line bg-surface p-1.5 text-muted transition hover:text-danger"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={s.notes ?? ""}
                        onChange={(e) =>
                          updateSlot(day.key, i, "notes", e.target.value || null)
                        }
                        placeholder="Notes (optional)"
                        maxLength={500}
                        className="form-input mt-2"
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted">No slots.</p>
              )}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          Time slots saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition hover:bg-primary-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save time slots"}
      </button>
    </form>
  );
}
