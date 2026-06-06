"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import { and, asc, eq, gt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  sessions,
  timeSlots,
  classrooms,
  locations,
  tenants,
  students,
  makeupOffers,
} from "@/lib/db/schema";
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

  const absentAttendanceIdStr = absentAttendanceId as string;

  // 1. Find the absent attendance row + its session/time_slot context.
  //    Join on session_id (the enrolled session), not made_up_in_session_id.
  const [r] = await db
    .select({
      id: attendanceRecords.id,
      studentId: attendanceRecords.studentId,
      sessionTimeSlotId: sessions.timeSlotId,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(sessions.id, attendanceRecords.sessionId))
    .where(eq(attendanceRecords.id, absentAttendanceIdStr))
    .limit(1);
  if (!r) redirect("/tenant/today?error=not-found");

  // 2. Pick the next future session in the SAME time slot.
  const now = new Date();
  const [nextSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.timeSlotId, r!.sessionTimeSlotId),
        gt(sessions.scheduledStartUtc, now),
        ne(sessions.status, "cancelled")
      )
    )
    .orderBy(asc(sessions.scheduledStartUtc))
    .limit(1);

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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    await db.insert(makeupOffers).values({
      absentAttendanceId: r!.id,
      offeredSessionId: nextSession!.id,
      state: "pending",
      tokenHash: hash,
      offeredBy: user.id,
      expiresAt,
    });
  } catch (err) {
    redirect(
      "/tenant/today?error=" +
        encodeURIComponent(err instanceof Error ? err.message : "insert-failed")
    );
  }

  revalidatePath("/tenant/today");
  revalidatePath("/tenant/makeups");
  // Surface the raw token URL once via query string so the front desk can copy
  // it and share with the parent. (Tokens are never stored unhashed.)
  const url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/makeup/${raw}`;

  // Also email the parent so they don't depend on the admin's copy/paste.
  fireMakeupOfferEmail({
    studentId: r!.studentId,
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
  // session -> time_slot -> classroom -> location -> tenant.
  const [studentRes, sessionRes] = await Promise.all([
    db
      .select({
        firstName: students.firstName,
        lastName: students.lastName,
        primaryParentName: students.primaryParentName,
        primaryEmail: students.primaryEmail,
        notificationPrefsJson: students.notificationPrefsJson,
      })
      .from(students)
      .where(eq(students.id, args.studentId))
      .limit(1),
    db
      .select({
        scheduledStartUtc: sessions.scheduledStartUtc,
        scheduledEndUtc: sessions.scheduledEndUtc,
        classroomName: classrooms.name,
        ianaTimezone: locations.ianaTimezone,
        tenantName: tenants.name,
      })
      .from(sessions)
      .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
      .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
      .innerJoin(locations, eq(locations.id, classrooms.locationId))
      .innerJoin(tenants, eq(tenants.id, locations.tenantId))
      .where(eq(sessions.id, args.offeredSessionId))
      .limit(1),
  ]);

  const student = studentRes[0];
  const session = sessionRes[0];
  if (!student || !session) return;
  if (!student.primaryEmail) return;
  const prefs = student.notificationPrefsJson as { email?: boolean } | null;
  if (prefs?.email === false) return;

  const tz = session.ianaTimezone;
  const classroomName = session.classroomName;
  const tenantName = session.tenantName;
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const startIso = session.scheduledStartUtc.toISOString();
  const endIso = session.scheduledEndUtc.toISOString();
  const startLocal = formatTimeInTimezone(startIso, tz);
  const endLocal = formatTimeInTimezone(endIso, tz);
  const sessionDate = new Date(startIso).toLocaleDateString(
    "en-US",
    { timeZone: tz, weekday: "long", month: "short", day: "numeric" }
  );

  const greeting = student.primaryParentName
    ? `Hi ${student.primaryParentName},`
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
    to: student.primaryEmail,
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

  // Confirm the absent attendance row and grab the student.
  const [absent] = await db
    .select({
      id: attendanceRecords.id,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.id, parsed.data.absent_attendance_id))
    .limit(1);
  if (!absent) redirect("/tenant/makeups?error=not-found");

  const studentId = absent!.studentId;
  // is_makeup is not modeled in the Drizzle schema; insert the bare make-up
  // attendance rows (the Make-up chip on Today degrades gracefully).
  const rows = parsed.data.session_ids.map((sessionId) => ({
    sessionId,
    studentId,
    status: "expected" as const,
  }));

  try {
    await db
      .insert(attendanceRecords)
      .values(rows)
      .onConflictDoNothing({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
      });
  } catch (err) {
    redirect(
      `/tenant/makeups/${absent!.id}/offer?error=${encodeURIComponent(
        err instanceof Error ? err.message : "insert-failed"
      )}`
    );
  }

  // Promote the absent record to made_up. made_up_in_session_id points at the
  // first selected session for traceability.
  try {
    await db
      .update(attendanceRecords)
      .set({
        status: "made_up",
        madeUpInSessionId: parsed.data.session_ids[0],
      })
      .where(eq(attendanceRecords.id, parsed.data.absent_attendance_id));
  } catch (err) {
    redirect(
      `/tenant/makeups/${absent!.id}/offer?error=${encodeURIComponent(
        err instanceof Error ? err.message : "update-failed"
      )}`
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

  // is_manual is not modeled in the Drizzle schema; insert bare attendance rows.
  const rows = parsed.data.session_ids.map((sid) => ({
    sessionId: sid,
    studentId: parsed.data.student_id,
    status: "expected" as const,
  }));

  try {
    await db
      .insert(attendanceRecords)
      .values(rows)
      .onConflictDoNothing({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
      });
  } catch (err) {
    redirect(
      `/tenant/makeups/manual?error=${encodeURIComponent(
        err instanceof Error ? err.message : "insert-failed"
      )}`
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

  const [offer] = await db
    .select({
      id: makeupOffers.id,
      state: makeupOffers.state,
      expiresAt: makeupOffers.expiresAt,
      offeredSessionId: makeupOffers.offeredSessionId,
      absentAttendanceId: makeupOffers.absentAttendanceId,
    })
    .from(makeupOffers)
    .where(eq(makeupOffers.tokenHash, hash))
    .limit(1);
  if (!offer) redirect("/makeup/invalid");

  const now = new Date();
  if (offer!.state !== "pending" || offer!.expiresAt < now) {
    redirect(`/makeup/${tokenStr}?status=${offer!.state}`);
  }

  if (choiceStr === "decline") {
    await db
      .update(makeupOffers)
      .set({ state: "declined", respondedAt: now })
      .where(eq(makeupOffers.id, offer!.id));
    redirect(`/makeup/${tokenStr}?status=declined`);
  }

  // accept: get the absent attendance row to find the student
  const [absentRow] = await db
    .select({ studentId: attendanceRecords.studentId })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.id, offer!.absentAttendanceId))
    .limit(1);
  if (!absentRow) redirect("/makeup/invalid");

  // Create attendance_record on the offered session for this student.
  // Soft-conflict: ignore if a row already exists (e.g. they're already enrolled).
  await db
    .insert(attendanceRecords)
    .values({
      sessionId: offer!.offeredSessionId,
      studentId: absentRow!.studentId,
      status: "expected",
    })
    .onConflictDoNothing({
      target: [attendanceRecords.sessionId, attendanceRecords.studentId],
    });

  // Update the absent row to mark it as made up + link to the new session.
  await db
    .update(attendanceRecords)
    .set({
      status: "made_up",
      madeUpInSessionId: offer!.offeredSessionId,
    })
    .where(eq(attendanceRecords.id, offer!.absentAttendanceId));

  await db
    .update(makeupOffers)
    .set({ state: "accepted", respondedAt: now })
    .where(eq(makeupOffers.id, offer!.id));

  redirect(`/makeup/${tokenStr}?status=accepted`);
}
