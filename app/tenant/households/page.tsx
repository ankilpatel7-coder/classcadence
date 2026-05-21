import Link from "next/link";
import { Pencil, Plus, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  primary_parent_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  students: { id: string; first_name: string; last_name: string }[] | null;
};

export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: { deleted?: string; error?: string };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("households")
    .select(
      "id, primary_parent_name, primary_email, primary_phone, students(id, first_name, last_name)"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Households</h1>
          <p className="mt-1 text-sm text-muted">
            Each household is one family. Add students under their household so
            siblings share contact info and notification preferences.
          </p>
        </div>
        <Link href="/tenant/households/new" className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add household
        </Link>
      </div>

      {searchParams.deleted ? (
        <div className="rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          Household deleted.
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load households: {error.message}
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-3 text-sm text-muted">No households yet.</p>
            <p className="mt-1 text-sm text-muted">Add one to start enrolling students.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/tenant/households/${h.id}/edit`}
                  className="group flex items-center justify-between px-4 py-3 transition hover:bg-bg/70"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {h.primary_parent_name}
                    </p>
                    <p className="text-xs text-muted">
                      {[h.primary_email, h.primary_phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {h.students && h.students.length > 0 ? (
                      <p className="mt-1 text-xs text-muted">
                        Students:{" "}
                        {h.students
                          .map((s) => `${s.first_name} ${s.last_name}`.trim())
                          .join(", ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">No students yet</p>
                    )}
                  </div>
                  <Pencil className="h-4 w-4 text-muted transition group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
