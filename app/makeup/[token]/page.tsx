import Link from "next/link";
import { createHash } from "crypto";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatTimeInTimezone } from "@/lib/time";
import { Logo } from "@/app/_components/Logo";
import { respondToMakeupAction } from "@/app/tenant/today/makeup-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Make-up class — ClassCadence" };

type OfferDetails = {
  id: string;
  state: "pending" | "accepted" | "declined" | "expired";
  expires_at: string;
  offered_session: {
    scheduled_start_utc: string;
    scheduled_end_utc: string;
    classroom: {
      name: string;
      location: { name: string; iana_timezone: string };
    };
  };
  student: { first_name: string; last_name: string };
};

async function lookupOffer(token: string): Promise<OfferDetails | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  const service = createSupabaseServiceClient();

  const { data } = await service
    .from("makeup_offers")
    .select(
      `id, state, expires_at,
       offered_session:sessions!makeup_offers_offered_session_id_fkey(
         scheduled_start_utc, scheduled_end_utc,
         time_slots!inner(
           classrooms!inner(
             name,
             locations!inner(name, iana_timezone)
           )
         )
       ),
       absent_attendance:attendance_records!makeup_offers_absent_attendance_id_fkey(
         student:students!inner(first_name, last_name)
       )`
    )
    .eq("token_hash", hash)
    .maybeSingle();

  if (!data) return null;
  type Raw = {
    id: string;
    state: OfferDetails["state"];
    expires_at: string;
    offered_session: {
      scheduled_start_utc: string;
      scheduled_end_utc: string;
      time_slots: {
        classrooms: { name: string; locations: { name: string; iana_timezone: string } };
      };
    };
    absent_attendance: { student: { first_name: string; last_name: string } };
  };
  const raw = data as unknown as Raw;
  return {
    id: raw.id,
    state: raw.state,
    expires_at: raw.expires_at,
    offered_session: {
      scheduled_start_utc: raw.offered_session.scheduled_start_utc,
      scheduled_end_utc: raw.offered_session.scheduled_end_utc,
      classroom: {
        name: raw.offered_session.time_slots.classrooms.name,
        location: raw.offered_session.time_slots.classrooms.locations,
      },
    },
    student: raw.absent_attendance.student,
  };
}

export default async function MakeupTokenPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { status?: string };
}) {
  const offer = await lookupOffer(params.token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo size={40} />
        </Link>

        {!offer ? (
          <Card>
            <h1 className="text-lg font-semibold text-ink">Link not found</h1>
            <p className="mt-1 text-sm text-muted">
              This make-up link is invalid or has been removed. Please contact
              your center if you think this is a mistake.
            </p>
          </Card>
        ) : (
          <Renderer offer={offer} status={searchParams.status} token={params.token} />
        )}
      </div>
    </main>
  );
}

function Renderer({
  offer,
  status,
  token,
}: {
  offer: OfferDetails;
  status?: string;
  token: string;
}) {
  const tz = offer.offered_session.classroom.location.iana_timezone;
  const start = formatTimeInTimezone(offer.offered_session.scheduled_start_utc, tz);
  const end = formatTimeInTimezone(offer.offered_session.scheduled_end_utc, tz);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(offer.offered_session.scheduled_start_utc));

  if (status === "accepted" || offer.state === "accepted") {
    return (
      <Card>
        <p className="flex items-center gap-2 text-base font-semibold text-success">
          <CheckCircle2 className="h-5 w-5" />
          Make-up accepted
        </p>
        <p className="mt-2 text-sm text-muted">
          {offer.student.first_name} {offer.student.last_name} is on the roster for
          this session. See you then!
        </p>
        <Details start={start} end={end} dateLabel={dateLabel} offer={offer} />
      </Card>
    );
  }

  if (status === "declined" || offer.state === "declined") {
    return (
      <Card>
        <p className="flex items-center gap-2 text-base font-semibold text-danger">
          <XCircle className="h-5 w-5" />
          Make-up declined
        </p>
        <p className="mt-2 text-sm text-muted">
          No worries. Your center will reach out if another opportunity opens.
        </p>
      </Card>
    );
  }

  if (offer.state === "expired" || new Date(offer.expires_at) < new Date()) {
    return (
      <Card>
        <h1 className="text-lg font-semibold text-ink">Link expired</h1>
        <p className="mt-1 text-sm text-muted">
          This make-up offer has expired. Please contact your center to arrange a new
          time.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
        <Sparkles className="h-4 w-4" />
        Make-up class offered
      </p>
      <h1 className="mt-2 text-xl font-semibold text-ink">
        {offer.student.first_name} {offer.student.last_name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        Your center can fit them into the session below. Confirm so we save their
        spot, or decline and we&apos;ll look for another option.
      </p>
      <Details start={start} end={end} dateLabel={dateLabel} offer={offer} />

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <form action={respondToMakeupAction} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="choice" value="accept" />
          <button type="submit" className="btn-primary w-full">
            Accept
          </button>
        </form>
        <form action={respondToMakeupAction} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="choice" value="decline" />
          <button type="submit" className="btn-secondary w-full">
            Decline
          </button>
        </form>
      </div>
    </Card>
  );
}

function Details({
  start,
  end,
  dateLabel,
  offer,
}: {
  start: string;
  end: string;
  dateLabel: string;
  offer: OfferDetails;
}) {
  return (
    <dl className="mt-4 space-y-1 rounded-md border border-line bg-bg/40 p-3 text-sm">
      <Row label="When" value={`${dateLabel}, ${start}–${end}`} />
      <Row label="Where" value={offer.offered_session.classroom.location.name} />
      <Row label="Classroom" value={offer.offered_session.classroom.name} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel p-6">
      <div className="space-y-1">{children}</div>
    </div>
  );
}
