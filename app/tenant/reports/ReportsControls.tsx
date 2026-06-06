"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type Tab = "analysis" | "daily";
export type Dimension = "student" | "class";

type Option = { id: string; name: string };

// Tab switcher + (analysis-only) by-student / by-class toggle and the
// student/class drill-down dropdown. All state lives in the URL so the server
// component re-renders with fresh data; this is purely navigation.
export function ReportsControls({
  tab,
  dimension,
  studentId,
  classId,
  students,
  classes,
}: {
  tab: Tab;
  dimension: Dimension;
  studentId: string;
  classId: string;
  students: Option[];
  classes: Option[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.replace(`/tenant/reports?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="inline-flex rounded-md border border-line bg-bg/50 p-1 text-xs">
        <TabButton active={tab === "analysis"} onClick={() => update({ tab: "analysis" })}>
          Analysis
        </TabButton>
        <TabButton active={tab === "daily"} onClick={() => update({ tab: "daily" })}>
          Daily log
        </TabButton>
      </div>

      {tab === "analysis" ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-line bg-bg/50 p-1 text-xs">
            <TabButton
              active={dimension === "student"}
              onClick={() => update({ dim: "student", class_id: null })}
            >
              By student
            </TabButton>
            <TabButton
              active={dimension === "class"}
              onClick={() => update({ dim: "class", student_id: null })}
            >
              By class
            </TabButton>
          </div>

          {dimension === "student" ? (
            <select
              value={studentId}
              onChange={(e) => update({ student_id: e.target.value || null })}
              className="form-input !py-1.5 !text-xs"
              aria-label="Filter by student"
            >
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={classId}
              onChange={(e) => update({ class_id: e.target.value || null })}
              className="form-input !py-1.5 !text-xs"
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 font-medium transition ${
        active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
