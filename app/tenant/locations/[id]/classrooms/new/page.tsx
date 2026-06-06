import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { locations } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { CreateClassroomForm } from "./CreateClassroomForm";

export const metadata = { title: "Add classroom — ClassCadence" };

export const dynamic = "force-dynamic";

export default async function NewClassroomPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUserOrRedirect();
  if (
    user.role !== "tenant_admin" &&
    user.role !== "location_admin" &&
    user.role !== "super_admin"
  ) {
    redirect("/tenant/locations");
  }

  // Confirm the location exists + belongs to this tenant.
  const [location] = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(
      user.tenantId
        ? and(eq(locations.id, params.id), eq(locations.tenantId, user.tenantId))
        : eq(locations.id, params.id)
    )
    .limit(1);
  if (!location) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/tenant/locations/${location.id}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {location.name}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Add a classroom</h1>
        <p className="mt-1 text-sm text-muted">
          Time slots and student schedules attach to classrooms.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <CreateClassroomForm locationId={location.id} />
      </div>
    </div>
  );
}
