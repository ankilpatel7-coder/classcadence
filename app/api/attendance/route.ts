import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  sessions,
  timeSlots,
  classrooms,
  locations,
  userProfiles,
} from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/session";
import { fireAbsentNotification } from "@/lib/notifications/absent-alert";
import { firePickupNotification } from "@/lib/notifications/pickup-alert";

// REST endpoint for per-row attendance updates. Lives outside the App
// Router server-action pipeline so a burst of clicks does not chain
// route-tree refreshes that block the next navigation.
//
// POST /api/attendance
// body: { attendance_id: uuid, action: "check_in"|"check_out"|"mark_absent"|"mark_excused"|"reset" }

const BodySchema = z.object({
  attendance_id: z.string().uuid(),
  action: z.enum([
    "check_in",
    "check_out",
    "mark_absent",
    "mark_excused",
    "reset",
  ]),
});

const WRITE_ROLES = new Set([
  "tenant_admin",
  "location_admin",
  "front_desk",
  "super_admin",
]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid-input" }, { status: 400 });
  }

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select({ role: userProfiles.role, tenantId: userProfiles.tenantId })
    .from(userProfiles)
    .where(eq(userProfiles.id, session.user.id))
    .limit(1);

  if (!WRITE_ROLES.has(profile?.role ?? "")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // App-level tenant isolation (replaces the old RLS check): confirm the
  // attendance row belongs to the caller's tenant before mutating it.
  // super_admin (tenantId null) may act across tenants.
  const [owner] = await db
    .select({ tenantId: locations.tenantId })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(sessions.id, attendanceRecords.sessionId))
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(eq(attendanceRecords.id, parsed.data.attendance_id))
    .limit(1);

  if (!owner) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }
  if (profile.role !== "super_admin" && owner.tenantId !== profile.tenantId) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const now = new Date();
  let updates: Partial<typeof attendanceRecords.$inferInsert> = {};
  switch (parsed.data.action) {
    case "check_in":
      updates = { status: "present", checkInAt: now };
      break;
    case "check_out":
      updates = { checkOutAt: now };
      break;
    case "mark_absent":
      updates = { status: "absent" };
      break;
    case "mark_excused":
      updates = { status: "excused" };
      break;
    case "reset":
      updates = { status: "expected", checkInAt: null, checkOutAt: null };
      break;
  }

  try {
    await db
      .update(attendanceRecords)
      .set(updates)
      .where(eq(attendanceRecords.id, parsed.data.attendance_id));
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "update-failed" },
      { status: 500 }
    );
  }

  if (parsed.data.action === "mark_absent" && profile.tenantId) {
    fireAbsentNotification({
      tenantId: profile.tenantId,
      attendanceId: parsed.data.attendance_id,
    }).catch((err) => console.error("[absent] notification failed:", err));
  }

  if (parsed.data.action === "check_out" && profile.tenantId) {
    firePickupNotification({
      tenantId: profile.tenantId,
      attendanceId: parsed.data.attendance_id,
    }).catch((err) => console.error("[pickup] notification failed:", err));
  }

  return NextResponse.json({ ok: true });
}
