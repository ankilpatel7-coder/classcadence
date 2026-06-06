"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { UserPlus, Search, Check } from "lucide-react";
import { manualCheckInAction, type ManualCheckInState } from "./actions";

type StudentOption = { id: string; firstName: string; lastName: string };
type SessionOption = { id: string; label: string };

const initialState: ManualCheckInState = { error: null, success: false };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn-primary !px-3 !py-1.5"
    >
      {pending ? "Checking in…" : "Check in"}
    </button>
  );
}

export function ManualCheckIn({
  students,
  sessions,
}: {
  students: StudentOption[];
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(manualCheckInAction, initialState);
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");

  useEffect(() => {
    if (state.success) {
      router.refresh();
      setOpen(false);
      setQuery("");
      setStudentId("");
    }
  }, [state.success, router]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? students.filter((s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
        )
      : students;
    return list.slice(0, 8);
  }, [query, students]);

  const selectedStudent = students.find((s) => s.id === studentId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary !px-3 !py-2"
      >
        <UserPlus className="h-4 w-4" />
        Manual check-in
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-ink">Manual check-in</h3>
            <p className="mt-1 text-xs text-muted">
              Add a walk-in student to one of today&apos;s classes and mark them
              present right away.
            </p>

            <form action={formAction} className="mt-4 space-y-4">
              {/* Student picker */}
              <div>
                <label className="block text-xs font-medium text-muted">
                  Student
                </label>
                {selectedStudent ? (
                  <div className="mt-1 flex items-center justify-between rounded-md border border-line bg-bg/40 px-3 py-2">
                    <span className="text-sm font-medium text-ink">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentId("")}
                      className="text-xs text-muted underline hover:text-ink"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-1 flex items-center gap-2 rounded-md border border-line bg-bg/40 px-2.5">
                      <Search className="h-3.5 w-3.5 text-muted" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search students…"
                        autoComplete="off"
                        className="w-full bg-transparent py-2 text-sm text-ink outline-none"
                      />
                    </div>
                    {matches.length > 0 ? (
                      <ul className="mt-1 max-h-44 overflow-auto rounded-md border border-line">
                        {matches.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => setStudentId(s.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-primary-soft/30"
                            >
                              <Check className="h-3.5 w-3.5 text-transparent" />
                              {s.firstName} {s.lastName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-muted">No students match.</p>
                    )}
                  </>
                )}
                <input type="hidden" name="student_id" value={studentId} />
              </div>

              {/* Session picker */}
              <div>
                <label
                  htmlFor="manual_session"
                  className="block text-xs font-medium text-muted"
                >
                  Class
                </label>
                {sessions.length > 0 ? (
                  <select
                    id="manual_session"
                    name="session_id"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="form-input mt-1"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    No classes scheduled today to add them to.
                  </p>
                )}
              </div>

              {state.error ? (
                <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
                  {state.error}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary !px-3 !py-1.5"
                >
                  Cancel
                </button>
                <SubmitButton disabled={!studentId || !sessionId} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
