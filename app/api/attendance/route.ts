import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fireAbsentNotification } from "@/lib/notifications/absent-alert";

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
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 }
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid-input" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!WRITE_ROLES.has(profile?.role ?? "")) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );
  }

  const nowIso = new Date().toISOString();
  let updates: Record<string, unknown> = {};
  switch (parsed.data.action) {
    case "check_in":
      updates = { status: "present", check_in_at: nowIso };
      break;
    case "check_out":
      updates = { check_out_at: nowIso };
      break;
    case "mark_absent":
      updates = { status: "absent" };
      break;
    case "mark_excused":
      updates = { status: "excused" };
      break;
    case "reset":
      updates = {
        status: "expected",
        check_in_at: null,
        check_out_at: null,
      };
      break;
  }

  const { error } = await supabase
    .from("attendance_records")
    .update(updates)
    .eq("id", parsed.data.attendance_id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  if (parsed.data.action === "mark_absent" && profile?.tenant_id) {
    fireAbsentNotification({
      tenantId: profile.tenant_id,
      attendanceId: parsed.data.attendance_id,
    }).catch((err) =>
      console.error("[absent] notification failed:", err)
    );
  }

  return NextResponse.json({ ok: true });
}
