"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { saveOperatingHoursAction, type HoursState } from "../../actions";

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

export type HoursWindow = {
  weekday: Weekday;
  open_time: string;
  close_time: string;
};

type State = Record<Weekday, HoursWindow[]>;

function emptyState(): State {
  return {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

function buildInitial(rules: HoursWindow[]): State {
  const s = emptyState();
  for (const r of rules) s[r.weekday].push(r);
  for (const k of Object.keys(s) as Weekday[]) {
    s[k].sort((a, b) => a.open_time.localeCompare(b.open_time));
  }
  return s;
}

export function HoursEditor({
  locationId,
  initialRules,
}: {
  locationId: string;
  initialRules: HoursWindow[];
}) {
  const [state, setState] = useState<State>(() => buildInitial(initialRules));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const flatRows = useMemo(() => {
    const out: HoursWindow[] = [];
    for (const day of WEEKDAYS) out.push(...state[day.key]);
    return out;
  }, [state]);

  function addWindow(day: Weekday) {
    setState((prev) => ({
      ...prev,
      [day]: [...prev[day], { weekday: day, open_time: "09:00", close_time: "17:00" }],
    }));
  }

  function removeWindow(day: Weekday, index: number) {
    setState((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }));
  }

  function updateWindow(
    day: Weekday,
    index: number,
    field: "open_time" | "close_time",
    value: string
  ) {
    setState((prev) => ({
      ...prev,
      [day]: prev[day].map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side validation: close > open per row.
    for (const row of flatRows) {
      if (row.close_time <= row.open_time) {
        setError(
          `Close time must be after open time (${row.weekday.toUpperCase()}: ` +
            `${row.open_time}–${row.close_time}).`
        );
        return;
      }
    }

    const formData = new FormData();
    formData.set("location_id", locationId);
    formData.set("rows", JSON.stringify(flatRows));

    setPending(true);
    const result: HoursState = await saveOperatingHoursAction(
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
          const windows = state[day.key];
          return (
            <div
              key={day.key}
              className="rounded-md border border-line bg-bg/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">{day.label}</p>
                <button
                  type="button"
                  onClick={() => addWindow(day.key)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add window
                </button>
              </div>

              {windows.length === 0 ? (
                <p className="mt-2 text-xs text-muted">Closed all day.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {windows.map((w, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        required
                        value={w.open_time}
                        onChange={(e) =>
                          updateWindow(day.key, i, "open_time", e.target.value)
                        }
                        className="form-input w-32"
                      />
                      <span className="text-xs text-muted">to</span>
                      <input
                        type="time"
                        required
                        value={w.close_time}
                        onChange={(e) =>
                          updateWindow(day.key, i, "close_time", e.target.value)
                        }
                        className="form-input w-32"
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(day.key, i)}
                        aria-label="Remove window"
                        className="btn-secondary !p-1.5 text-muted hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
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
          Hours saved.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
      >
        {pending ? "Saving…" : "Save hours"}
      </button>
    </form>
  );
}
