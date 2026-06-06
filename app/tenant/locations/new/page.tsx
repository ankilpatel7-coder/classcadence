import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { getTimezoneGroups } from "@/lib/timezones";
import { CreateLocationForm } from "./CreateLocationForm";

export const metadata = { title: "Add location — ClassCadence" };

export const dynamic = "force-dynamic";

export default async function NewLocationPage() {
  const user = await getCurrentUserOrRedirect();
  if (user.role !== "tenant_admin" && user.role !== "super_admin") {
    redirect("/tenant/locations");
  }

  // Default the timezone field to the tenant's default.
  const [tenant] = await db
    .select({ defaultIanaTz: tenants.defaultIanaTz })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId!))
    .limit(1);

  const timezoneGroups = getTimezoneGroups();
  const defaultTimezone = tenant?.defaultIanaTz ?? "America/New_York";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tenant/locations"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to locations
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Add a location</h1>
        <p className="mt-1 text-sm text-muted">
          You can edit any of this later, and add weekly hours after saving.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <CreateLocationForm
          defaultTimezone={defaultTimezone}
          timezoneGroups={timezoneGroups}
        />
      </div>
    </div>
  );
}
