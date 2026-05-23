"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { sendEmail } from "@/lib/email/client";
import { formatTimeInTimezone } from "@/lib/time";

function canOfferMakeup(role: string | null | undefined) {
  return (
    role === "tenant_admin" ||
    role === "location_admin" ||
    role === "front_desk" ||
    role === "super_admin"
  );
}

function newToken() {
  const raw = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

// Offers a make-up: picks the next upcoming session in the same time slot
// (since classrooms cap by slot capacity, we don't auto-choose across slots),
// creates a makeup_offer row with a hashed token, returns the raw token URL.
export async function offerMakeupAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canOfferMakeup(user.role)) redirect("/tenant/today?error=forbidden");

  const absentAttendanceId = formData.get("attendance_id");
  if (
    typeof absentAttendanceId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(absentAttendanceId)
  ) {
    redirect("/tenant/today?error=invalid-id");
  }

  const supabase = createSupabaseServerClient();

  // 1. Find the absent attendance row + its session/time_slot context.
  const { data: row } = await supabase
    .from("attendance_records")
    .select(
      "id, student_id, sessions!inner(id, time_slot_id, scheduled_end_utc)"
    )
    .eq("id", absentAttendanceId)
    .maybeSingle();
  type Row = {
    id: string;
    student_id: string;
    sessions: {
      id: string;
      time_slot_id: string;
      scheduled_end_utc: string;
    };
  };
  const r = row as unknown as Row | null;
  if (!r) redirect("/tenant/today?error=not-found");

  // 2. Pick the next future session in the SAME time slot.
  const nowIso = new Date().toISOString();
  const { data: nextSession } = await supabase
    .from("sessions")
    .select("id, scheduled_start_utc")
    .eq("time_slot_id", r!.sessions.time_slot_id)
    .gt("scheduled_start_utc", nowIso)
    .neq("status", "cancelled")
    .order("scheduled_start_utc", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextSession) {
    redirect(
      "/tenant/today?error=" +
        encodeURIComponent(
          "No upcoming session in this time slot to offer as a make-up. Add more sessions first."
        )
    );
  }

  // 3. Insert make-up offer with hashed token. 7-day expiry.
  const { raw, hash } = newToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("makeup_offers").insert({
    absent_attendance_id: r!.id,
    offered_session_id: nextSession!.id,
    state: "pending",
    token_hash: hash,
    offered_by: user.id,
    expires_at: expiresAt,
  });
  if (error) {
    redirect("/tenant/today?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/tenant/today");
  revalidatePath("/tenant/makeups");
  // Surface the raw token URL once via query string so the front desk can copy
  // it and share with the parent. (Tokens are never stored unhashed.)
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/makeup/${raw}`;

  // Also email the parent so they don't depend on the admin's copy/paste.
  fireMakeupOfferEmail({
    studentId: r!.student_id,
    offeredSessionId: nextSession!.id,
    url,
  }).catch((err) => console.error("[makeup] email failed:", err));

  redirect(
    `/tenant/makeups?makeup_url=${encodeURIComponent(url)}`
  );
}

async function fireMakeupOfferEmail(args: {
  studentId: string;
  offeredSessionId: string;
  url: string;
}) {
  const service = createSupabaseServiceClient();

  const [studentRes, sessionRes] = await Promise.all([
    service
      .from("students")
      .select(
        "first_name, last_name, primary_parent_name, primary_email, notification_prefs_json"
      )
      .eq("id", args.studentId)
      .maybeSingle(),
    service
      .from("sessions")
      .select(
        "scheduled_start_utc, scheduled_end_utc, time_slots!inner(classrooms!inner(name, locations!inner(iana_timezone, tenants!inner(name))))"
      )
      .eq("id", args.offeredSessionId)
      .maybeSingle(),
  ]);

  type SRow = {
    first_name: string;
    last_name: string;
    primary_parent_name: string | null;
    primary_email: string | null;
    notification_prefs_json: { email?: boolean } | null;
  };
  type SesRow = {
    scheduled_start_utc: string;
    scheduled_end_utc: string;
    time_slots: {
      classrooms: {
        name: string;
        locations: {
          iana_timezone: string;
          tenants: { name: string };
        };
      };
    };
  };

  const student = studentRes.data as unknown as SRow | null;
  const session = sessionRes.data as unknown as SesRow | null;
  if (!student || !session) return;
  if (!student.primary_email) return;
  if (student.notification_prefs_json?.email === false) return;

  const tz = session.time_slots.classrooms.locations.iana_timezone;
  const classroomName = session.time_slots.classrooms.name;
  const tenantName = session.time_slots.classrooms.locations.tenants.name;
  const studentName = `${student.first_name} ${student.last_name}`.trim();
  const startLocal = formatTimeInTimezone(session.scheduled_start_utc, tz);
  const endLocal = formatTimeInTimezone(session.scheduled_end_utc, tz);
  const sessionDate = new Date(session.scheduled_start_utc).toLocaleDateString(
    "en-US",
    { timeZone: tz, weekday: "long", month: "short", day: "numeric" }
  );

  const greeting = student.primary_parent_name
    ? `Hi ${student.primary_parent_name},`
    : "Hi there,";

  const text = [
    greeting,
    "",
    `We'd like to offer ${studentName} a make-up class:`,
    "",
    `  • ${sessionDate} ${startLocal} – ${endLocal} — ${classroomName}`,
    "",
    `Tap the link below to accept or decline — the offer expires in 7 days:`,
    args.url,
    "",
    `— ${tenantName}`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">${escMakeup(greeting)}</p>
  <p style="margin:0 0 16px;">We'd like to offer <strong>${escMakeup(studentName)}</strong> a make-up class:</p>
  <div style="background:#FFF7ED;border:1px solid #FED7AA;border-left:3px solid #F97316;border-radius:6px;padding:12px 16px;margin:0 0 20px;">
    <p style="margin:0;font-size:14px;">
      <strong>${escMakeup(sessionDate)}</strong>
      &nbsp;<span style="font-family:ui-monospace,Menlo,monospace;font-weight:600;">${startLocal} – ${endLocal}</span>
    </p>
    <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${escMakeup(classroomName)}</p>
  </div>
  <p style="margin:0 0 16px;">
    <a href="${escMakeup(args.url)}" style="display:inline-block;background-image:linear-gradient(180deg,#2BC98A 0%,#1AA876 55%,#0B6845 100%);color:#fff;font-weight:600;padding:10px 18px;border-radius:6px;text-decoration:none;">Accept or decline</a>
  </p>
  <p style="margin:0 0 16px;color:#6B7280;font-size:13px;">This offer expires in 7 days.</p>
  <p style="margin:0;color:#6B7280;font-size:13px;">— ${escMakeup(tenantName)}</p>
</body></html>`;

  await sendEmail({
    to: student.primary_email,
    subject: `Make-up class offered for ${studentName}`,
    text,
    html,
  });
}

function escMakeup(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============ Admin-driven make-up: pick N sessions explicitly ============

const CreateMakeupsSchema = z.object({
  absent_attendance_id: z.string().uuid(),
  session_ids: z.array(z.string().uuid()).min(1, "Pick at least one session."),
});

export async function createMakeupAttendancesAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canOfferMakeup(user.role)) redirect("/tenant/makeups?error=forbidden");

  const absentId = formData.get("absent_attendance_id");
  const sessionIds = formData.getAll("session_ids").map((v) => String(v));

  const parsed = CreateMakeupsSchema.safeParse({
    absent_attendance_id: absentId,
    session_ids: sessionIds,
  });
  if (!parsed.success) {
    redirect(
      `/tenant/makeups/${absentId}/offer?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Pick at least one session."
      )}`
    );
  }

  const supabase = createSupabaseServerClient();

  // Confirm the absent attendance row and grab the student.
  const { data: absent } = await supabase
    .from("attendance_records")
    .select("id, student_id, status")
    .eq("id", parsed.data.absent_attendance_id)
    .maybeSingle();
  if (!absent) redirect("/tenant/makeups?error=not-found");

  const studentId = absent.student_id as string;
  type AttendanceInsert = {
    session_id: string;
    student_id: string;
    status: string;
    is_makeup?: boolean;
  };
  const rows: AttendanceInsert[] = parsed.data.session_ids.map(
    (sessionId) => ({
      session_id: sessionId,
      student_id: studentId,
      status: "expected",
      is_makeup: true,
    })
  );

  // Try with is_makeup first; if the migration hasn't been applied, retry
  // without it so the make-up still works (just no Make-up chip on Today).
  let { error: insertError } = await supabase
    .from("attendance_records")
    .upsert(rows, {
      onConflict: "session_id,student_id",
      ignoreDuplicates: true,
    });
  if (insertError && /is_makeup/.test(insertError.message)) {
    const fallback: AttendanceInsert[] = rows.map((r) => ({
      session_id: r.session_id,
      student_id: r.student_id,
      status: r.status,
    }));
    const retry = await supabase
      .from("attendance_records")
      .upsert(fallback, {
        onConflict: "session_id,student_id",
        ignoreDuplicates: true,
      });
    insertError = retry.error;
  }
  if (insertError) {
    redirect(
      `/tenant/makeups/${absent.id}/offer?error=${encodeURIComponent(insertError.message)}`
    );
  }

  // Promote the absent record to made_up. made_up_in_session_id points at the
  // first selected session for traceability — the rest live with is_makeup=true.
  const { error: updateError } = await supabase
    .from("attendance_records")
    .update({
      status: "made_up",
      made_up_in_session_id: parsed.data.session_ids[0],
    })
    .eq("id", parsed.data.absent_attendance_id);
  if (updateError) {
    redirect(
      `/tenant/makeups/${absent.id}/offer?error=${encodeURIComponent(updateError.message)}`
    );
  }

  revalidatePath("/tenant/makeups");
  revalidatePath("/tenant/today");
  revalidatePath("/tenant/schedule");
  redirect(`/tenant/makeups?added=${parsed.data.session_ids.length}`);
}

// ============ Manual one-time class add (not tied to an absence) ============

const CreateManualSchema = z.object({
  student_id: z.string().uuid(),
  session_ids: z.array(z.string().uuid()).min(1, "Pick at least one session."),
});

export async function createManualAttendancesAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canOfferMakeup(user.role)) redirect("/tenant/makeups?error=forbidden");

  const studentId = formData.get("student_id");
  const sessionIds = formData.getAll("session_ids").map((v) => String(v));

  const parsed = CreateManualSchema.safeParse({
    student_id: studentId,
    session_ids: sessionIds,
  });
  if (!parsed.success) {
    redirect(
      `/tenant/makeups/manual?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "Pick at least one session."
      )}`
    );
  }

  const supabase = createSupabaseServerClient();
  type AttendanceInsert = {
    session_id: string;
    student_id: string;
    status: string;
    is_manual?: boolean;
  };
  const rows: AttendanceInsert[] = parsed.data.session_ids.map((sid) => ({
    session_id: sid,
    student_id: parsed.data.student_id,
    status: "expected",
    is_manual: true,
  }));

  // Try with is_manual; fall back if the column doesn't exist yet.
  let { error: insertError } = await supabase
    .from("attendance_records")
    .upsert(rows, {
      onConflict: "session_id,student_id",
      ignoreDuplicates: true,
    });
  if (insertError && /is_manual/.test(insertError.message)) {
    const fallback = rows.map((r) => ({
      session_id: r.session_id,
      student_id: r.student_id,
      status: r.status,
    }));
    const retry = await supabase
      .from("attendance_records")
      .upsert(fallback, {
        onConflict: "session_id,student_id",
        ignoreDuplicates: true,
      });
    insertError = retry.error;
  }
  if (insertError) {
    redirect(
      `/tenant/makeups/manual?error=${encodeURIComponent(insertError.message)}`
    );
  }

  revalidatePath("/tenant/makeups");
  revalidatePath("/tenant/today");
  revalidatePath("/tenant/schedule");
  redirect(`/tenant/makeups?manual_added=${parsed.data.session_ids.length}`);
}

// ============ Parent-facing accept/decline (public route) ============

const ACTIONS = ["accept", "decline"] as const;
type MakeupResponse = (typeof ACTIONS)[number];

export async function respondToMakeupAction(formData: FormData) {
  const token = formData.get("token");
  const choice = formData.get("choice");
  if (
    typeof token !== "string" ||
    typeof choice !== "string" ||
    !ACTIONS.includes(choice as MakeupResponse)
  ) {
    redirect("/makeup/invalid");
  }

  const tokenStr = token as string;
  const choiceStr = choice as MakeupResponse;

  const hash = createHash("sha256").update(tokenStr).digest("hex");

  const service = createSupabaseServiceClient();
  const { data: offer } = await service
    .from("makeup_offers")
    .select("id, state, expires_at, offered_session_id, absent_attendance_id")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!offer) redirect("/makeup/invalid");

  const now = new Date();
  if (
    offer.state !== "pending" ||
    new Date(offer.expires_at as string) < now
  ) {
    redirect(`/makeup/${tokenStr}?status=${offer.state}`);
  }

  if (choiceStr === "decline") {
    await service
      .from("makeup_offers")
      .update({ state: "declined", responded_at: now.toISOString() })
      .eq("id", offer.id);
    redirect(`/makeup/${tokenStr}?status=declined`);
  }

  // accept: get the absent attendance row to find the student
  const { data: absentRow } = await service
    .from("attendance_records")
    .select("student_id")
    .eq("id", offer.absent_attendance_id)
    .maybeSingle();
  if (!absentRow) redirect("/makeup/invalid");

  // Create attendance_record on the offered session for this student.
  // Soft-conflict: ignore if a row already exists (e.g. they're already enrolled).
  await service.from("attendance_records").upsert(
    {
      session_id: offer.offered_session_id,
      student_id: absentRow.student_id,
      status: "expected",
    },
    { onConflict: "session_id,student_id", ignoreDuplicates: true }
  );

  // Update the absent row to mark it as made up + link to the new session.
  await service
    .from("attendance_records")
    .update({
      status: "made_up",
      made_up_in_session_id: offer.offered_session_id,
    })
    .eq("id", offer.absent_attendance_id);

  await service
    .from("makeup_offers")
    .update({ state: "accepted", responded_at: now.toISOString() })
    .eq("id", offer.id);

  redirect(`/makeup/${tokenStr}?status=accepted`);
}
