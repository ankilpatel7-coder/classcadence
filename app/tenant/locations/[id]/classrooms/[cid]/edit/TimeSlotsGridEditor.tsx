"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  saveTimeSlotsAction,
  type TimeSlotsState,
} from "../../actions";

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const WEEKDAYS: { key: Weekday; short: string; full: string }[] = [
  { key: "mon", short: "Mon", full: "Monday" },
  { key: "tue", short: "Tue", full: "Tuesday" },
  { key: "wed", short: "Wed", full: "Wednesday" },
  { key: "thu", short: "Thu", full: "Thursday" },
  { key: "fri", short: "Fri", full: "Friday" },
  { key: "sat", short: "Sat", full: "Saturday" },
  { key: "sun", short: "Sun", full: "Sunday" },
];

export type HoursWindow = {
  weekday: Weekday;
  open_time: string; // "HH:MM"
  close_time: string; // "HH:MM"
};

export type ExistingSlot = {
  id: string;
  weekday: Weekday;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
};

const MIN_INCREMENT = 30;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function add30(hhmm: string): string {
  return fromMinutes(toMinutes(hhmm) + MIN_INCREMENT);
}

function buildAxisRange(operatingHours: HoursWindow[]): {
  startMin: number;
  endMin: number;
} {
  if (operatingHours.length === 0) {
    return { startMin: 9 * 60, endMin: 17 * 60 };
  }
  let earliest = Infinity;
  let latest = 0;
  for (const h of operatingHours) {
    earliest = Math.min(earliest, toMinutes(h.open_time));
    latest = Math.max(latest, toMinutes(h.close_time));
  }
  // Snap to nice boundaries
  earliest = Math.floor(earliest / MIN_INCREMENT) * MIN_INCREMENT;
  latest = Math.ceil(latest / MIN_INCREMENT) * MIN_INCREMENT;
  return { startMin: earliest, endMin: latest };
}

function isWithinHours(
  weekday: Weekday,
  startMin: number,
  endMin: number,
  hours: HoursWindow[]
): boolean {
  return hours
    .filter((h) => h.weekday === weekday)
    .some(
      (h) =>
        toMinutes(h.open_time) <= startMin && endMin <= toMinutes(h.close_time)
    );
}

type CellKey = string; // `${weekday}_${startMin}`

function keyOf(weekday: Weekday, startMin: number): CellKey {
  return `${weekday}_${startMin}`;
}

export function TimeSlotsGridEditor({
  classroomId,
  locationId,
  classroomColor,
  operatingHours,
  existingSlots,
}: {
  classroomId: string;
  locationId: string;
  classroomColor: string;
  operatingHours: HoursWindow[];
  existingSlots: ExistingSlot[];
}) {
  const { startMin, endMin } = useMemo(
    () => buildAxisRange(operatingHours),
    [operatingHours]
  );

  // Build the list of 30-min time rows.
  const timeRows = useMemo(() => {
    const out: number[] = [];
    for (let t = startMin; t < endMin; t += MIN_INCREMENT) out.push(t);
    return out;
  }, [startMin, endMin]);

  // Weekdays that have at least one operating-hours window.
  const activeWeekdays = useMemo(
    () =>
      WEEKDAYS.filter((d) =>
        operatingHours.some((h) => h.weekday === d.key)
      ),
    [operatingHours]
  );

  // Map of cell key -> { existingSlotId? }. A cell is "covered" if it lies inside an active existing slot.
  const initialCoverage = useMemo(() => {
    const cov = new Map<CellKey, string>(); // cellKey -> slotId
    for (const slot of existingSlots) {
      const sMin = toMinutes(slot.start_time);
      const eMin = toMinutes(slot.end_time);
      for (let t = sMin; t < eMin; t += MIN_INCREMENT) {
        cov.set(keyOf(slot.weekday, t), slot.id);
      }
    }
    return cov;
  }, [existingSlots]);

  // Staged edits:
  //   addedCells: keys to insert as new 30-min slots
  //   removedSlotIds: existing slot ids to delete
  const [addedCells, setAddedCells] = useState<Set<CellKey>>(new Set());
  const [removedSlotIds, setRemovedSlotIds] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  const hasChanges =
    addedCells.size > 0 || removedSlotIds.size > 0;

  function cellState(weekday: Weekday, t: number) {
    const key = keyOf(weekday, t);
    const inHours = isWithinHours(
      weekday,
      t,
      t + MIN_INCREMENT,
      operatingHours
    );
    if (!inHours) return { kind: "closed" as const };

    const existingId = initialCoverage.get(key);
    const isRemoved = existingId ? removedSlotIds.has(existingId) : false;
    const isAdded = addedCells.has(key);

    if (existingId && !isRemoved) return { kind: "slot-existing" as const, existingId };
    if (isAdded) return { kind: "slot-new" as const };
    return { kind: "open" as const };
  }

  function onCellClick(weekday: Weekday, t: number) {
    setError(null);
    setSuccess(false);

    const key = keyOf(weekday, t);
    const inHours = isWithinHours(weekday, t, t + MIN_INCREMENT, operatingHours);
    if (!inHours) return;

    const existingId = initialCoverage.get(key);
    if (existingId) {
      // Toggle removal of the whole existing slot.
      setRemovedSlotIds((prev) => {
        const next = new Set(prev);
        if (next.has(existingId)) next.delete(existingId);
        else next.add(existingId);
        return next;
      });
      return;
    }

    setAddedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function discardChanges() {
    setAddedCells(new Set());
    setRemovedSlotIds(new Set());
    setError(null);
    setSuccess(false);
  }

  async function onSave() {
    setError(null);
    setSuccess(false);

    const added = Array.from(addedCells).map((key) => {
      const [weekday, tStr] = key.split("_");
      const t = Number(tStr);
      return {
        weekday: weekday as Weekday,
        start_time: fromMinutes(t),
        end_time: fromMinutes(t + MIN_INCREMENT),
      };
    });

    const formData = new FormData();
    formData.set("classroom_id", classroomId);
    formData.set("location_id", locationId);
    formData.set("added_cells", JSON.stringify(added));
    formData.set("removed_slot_ids", JSON.stringify(Array.from(removedSlotIds)));

    setPending(true);
    const result: TimeSlotsState = await saveTimeSlotsAction(
      { error: null, success: false },
      formData
    );
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setAddedCells(new Set());
    setRemovedSlotIds(new Set());
    setSuccess(true);
  }

  if (operatingHours.length === 0) {
    return (
      <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
        Set operating hours for this location first — the grid uses them to
        show which 30-minute cells are available.
      </div>
    );
  }

  const summary = useMemo(() => {
    // Number of currently *effective* 30-min cells (after pending edits).
    let count = 0;
    for (const [key, slotId] of initialCoverage.entries()) {
      if (!removedSlotIds.has(slotId)) count++;
    }
    count += addedCells.size;
    return count;
  }, [initialCoverage, removedSlotIds, addedCells]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <LegendSwatch label="Available" className="bg-bg" />
          <LegendSwatch
            label="Slot"
            className=""
            style={{ backgroundColor: classroomColor, borderColor: classroomColor }}
          />
          <LegendSwatch label="Pending" className="bg-primary/15 ring-1 ring-primary/40" />
          <LegendSwatch label="Closed" className="bg-line/40" />
        </div>
        <p className="text-xs text-muted">
          <span className="font-mono text-ink">{summary}</span> × 30-min
          slot{summary === 1 ? "" : "s"} after save
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
        <div
          className="min-w-[640px] grid"
          style={{
            gridTemplateColumns: `72px repeat(${activeWeekdays.length}, minmax(80px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 border-b border-line bg-bg/80 backdrop-blur-sm" />
          {activeWeekdays.map((d) => (
            <div
              key={d.key}
              className="border-b border-l border-line bg-bg/80 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted backdrop-blur-sm"
            >
              {d.short}
            </div>
          ))}

          {/* Body rows */}
          {timeRows.map((t) => (
            <RowFragment
              key={t}
              t={t}
              activeWeekdays={activeWeekdays}
              cellState={cellState}
              onCellClick={onCellClick}
              classroomColor={classroomColor}
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="inline-flex items-center gap-1 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
          <Sparkles className="h-3.5 w-3.5" />
          Time slots saved.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!hasChanges || pending}
          className="btn-primary"
        >
          {pending ? "Saving…" : hasChanges ? "Save changes" : "No changes"}
        </button>
        {hasChanges ? (
          <button
            type="button"
            onClick={discardChanges}
            disabled={pending}
            className="btn-secondary"
          >
            Discard
          </button>
        ) : null}
        {hasChanges ? (
          <span className="text-xs text-muted">
            {addedCells.size > 0
              ? `+${addedCells.size} new`
              : null}
            {addedCells.size > 0 && removedSlotIds.size > 0 ? " · " : ""}
            {removedSlotIds.size > 0
              ? `−${removedSlotIds.size} removed`
              : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RowFragment({
  t,
  activeWeekdays,
  cellState,
  onCellClick,
  classroomColor,
}: {
  t: number;
  activeWeekdays: { key: Weekday; short: string; full: string }[];
  cellState: (weekday: Weekday, t: number) => {
    kind: "open" | "closed" | "slot-existing" | "slot-new";
    existingId?: string;
  };
  onCellClick: (weekday: Weekday, t: number) => void;
  classroomColor: string;
}) {
  const label = fromMinutes(t);
  const isHourMark = t % 60 === 0;
  return (
    <>
      <div
        className={`sticky left-0 z-10 flex items-start justify-end border-l border-line bg-surface px-2 py-1 text-[10px] tabular-nums ${
          isHourMark ? "text-ink font-medium" : "text-muted"
        }`}
        style={{ borderTop: isHourMark ? "1px solid #e5e7eb" : "1px dashed #f0eee9" }}
      >
        {isHourMark ? label : ""}
      </div>
      {activeWeekdays.map((d) => {
        const state = cellState(d.key, t);
        return (
          <Cell
            key={d.key}
            weekday={d.key}
            t={t}
            state={state}
            isHourMark={isHourMark}
            classroomColor={classroomColor}
            onClick={onCellClick}
            label={`${d.full} ${label}`}
          />
        );
      })}
    </>
  );
}

function Cell({
  weekday,
  t,
  state,
  isHourMark,
  classroomColor,
  onClick,
  label,
}: {
  weekday: Weekday;
  t: number;
  state: { kind: "open" | "closed" | "slot-existing" | "slot-new" };
  isHourMark: boolean;
  classroomColor: string;
  onClick: (weekday: Weekday, t: number) => void;
  label: string;
}) {
  const baseBorder = `border-l border-line ${
    isHourMark ? "border-t border-line" : "border-t border-dashed border-line/60"
  }`;
  const common = "h-7 cursor-pointer transition";

  if (state.kind === "closed") {
    return (
      <div
        className={`${baseBorder} h-7 bg-line/30`}
        aria-label={`${label} (closed)`}
      />
    );
  }

  if (state.kind === "slot-existing") {
    return (
      <button
        type="button"
        onClick={() => onClick(weekday, t)}
        aria-label={`${label} (slot, click to remove)`}
        className={`${baseBorder} ${common} hover:brightness-110`}
        style={{ backgroundColor: classroomColor }}
      />
    );
  }

  if (state.kind === "slot-new") {
    return (
      <button
        type="button"
        onClick={() => onClick(weekday, t)}
        aria-label={`${label} (new slot, click to remove)`}
        className={`${baseBorder} ${common} bg-primary/20 ring-1 ring-inset ring-primary/40 hover:bg-primary/30`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(weekday, t)}
      aria-label={`${label} (available, click to add slot)`}
      className={`${baseBorder} ${common} bg-bg hover:bg-primary/10`}
    />
  );
}

function LegendSwatch({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-3 w-3 rounded-sm border border-line ${className ?? ""}`}
        style={style}
      />
      <span>{label}</span>
    </span>
  );
}
