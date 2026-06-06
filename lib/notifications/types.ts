// Notification taxonomy. The `type` column on the notifications table
// stores the string key; payload shape is enforced at the call site by
// the helper signatures in ./create.ts.

export type NotificationType =
  | "enrollment_confirmed"
  | "student_absent"
  | "class_reminder"
  | "student_pickup";

export type EnrollmentConfirmedPayload = {
  student_id: string;
  student_name: string;
  classroom_name: string;
  weekday: string; // "mon" | "tue" | ...
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
};

export type StudentAbsentPayload = {
  student_id: string;
  student_name: string;
  classroom_name: string;
  date: string; // YYYY-MM-DD in tenant tz
  time: string; // "HH:MM"
};

export type ClassReminderPayload = {
  date: string; // YYYY-MM-DD
  session_count: number;
  student_count: number;
};

export type StudentPickupPayload = {
  student_id: string;
  student_name: string;
  classroom_name: string;
  date: string; // YYYY-MM-DD in tenant tz
  time: string; // "HH:MM"
};
