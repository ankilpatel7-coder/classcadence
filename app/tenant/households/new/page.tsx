import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CreateHouseholdForm } from "./CreateHouseholdForm";

export const metadata = { title: "Add household — ClassCadence" };

export default function NewHouseholdPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/tenant/households"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to households
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Add a household</h1>
        <p className="mt-1 text-sm text-muted">
          You&apos;ll add students under this household on the next screen.
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
        <CreateHouseholdForm />
      </div>
    </div>
  );
}
