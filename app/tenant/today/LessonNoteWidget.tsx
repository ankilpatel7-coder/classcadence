"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import { saveLessonNoteAction, type LessonNoteState } from "./actions";

export type ExistingNote = {
  body: string;
  visibility: "internal" | "parent";
  createdAt: string;
};

const initialState: LessonNoteState = { error: null, success: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white shadow-emboss transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save note"}
    </button>
  );
}

export function LessonNoteWidget({
  attendanceId,
  existingNotes,
}: {
  attendanceId: string;
  existingNotes: ExistingNote[];
}) {
  const [state, formAction] = useFormState(saveLessonNoteAction, initialState);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      ref.current?.reset();
      setOpen(false);
    }
  }, [state.success]);

  return (
    <div className="mt-2 space-y-2">
      {existingNotes.length > 0 ? (
        <ul className="space-y-1">
          {existingNotes.map((n, i) => (
            <li
              key={i}
              className="rounded-md border border-line bg-bg/60 px-2 py-1 text-[11px] text-ink"
            >
              <span className="mr-2 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-strong">
                {n.visibility}
              </span>
              {n.body}
            </li>
          ))}
        </ul>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <NotebookPen className="h-3 w-3" />
          Add note
        </button>
      ) : (
        <form ref={ref} action={formAction} className="space-y-1">
          <input type="hidden" name="attendance_id" value={attendanceId} />
          <textarea
            name="body"
            rows={2}
            required
            placeholder="What did they work on?"
            className="form-input text-xs"
          />
          <div className="flex items-center gap-2">
            <select name="visibility" defaultValue="internal" className="form-input w-32 text-xs">
              <option value="internal">Internal</option>
              <option value="parent">Visible to parent</option>
            </select>
            <Submit />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
          {state.error ? (
            <p className="rounded-md bg-danger/10 px-2 py-1 text-[10px] text-danger">
              {state.error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
