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
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/tenant/students"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to students
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Add a student</h1>
        <p className="mt-1 text-sm text-muted">
          You can assign them to time slots after saving.
        </p>
      </div>

      <div className="panel p-6">
        <CreateStudentForm locations={locations} />
      </div>
    </div>
  );
}
