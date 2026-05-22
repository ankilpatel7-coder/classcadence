import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { CreateStudentForm } from "./CreateStudentForm";

export const metadata = { title: "Add student — ClassCadence" };
export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  if (!locations || locations.length === 0) {
    redirect(
      `/tenant/locations/new?error=${encodeURIComponent("Create an active location first.")}`
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link
          href="/tenant/students"
          className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to students
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-ink">Add a student</h1>
        <p className="text-xs text-muted">
          You can assign them to time slots after saving.
        </p>
      </div>

      <div className="panel p-4 md:p-5">
        <CreateStudentForm locations={locations} />
      </div>
    </div>
  );
}
