import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateTenantForm } from "./CreateTenantForm";

export const metadata = {
  title: "Create tenant — ClassCadence",
};

export default function NewTenantPage() {
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
        <h1 className="text-2xl font-semibold text-ink">Create tenant</h1>
        <p className="mt-1 text-sm text-muted">
          Provisions a new tenant and its branding row. Optionally invites the first
          Tenant Admin.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <CreateTenantForm />
      </div>
    </div>
  );
}
