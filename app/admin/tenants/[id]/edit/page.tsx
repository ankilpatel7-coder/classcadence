import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EditTenantForm } from "./EditTenantForm";

export const metadata = {
  title: "Edit tenant — ClassCadence",
};

export const dynamic = "force-dynamic";

export default async function EditTenantPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, legal_name, default_iana_tz, country, status")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !tenant) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to tenants
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Edit tenant</h1>
        <p className="mt-1 text-sm text-muted">
          Update the tenant&apos;s details or change its operating status.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <EditTenantForm tenant={tenant} />
      </div>
    </div>
  );
}
