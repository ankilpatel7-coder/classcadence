import Link from "next/link";
import { Sparkles } from "lucide-react";

export function OfferMakeupButton({ attendanceId }: { attendanceId: string }) {
  return (
    <Link
      href={`/tenant/makeups/${attendanceId}/offer`}
      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-surface px-2.5 py-1.5 text-[11px] font-medium text-primary shadow-card transition hover:-translate-y-px hover:bg-primary-soft/40 hover:shadow-lift"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Offer make-up
    </Link>
  );
}
