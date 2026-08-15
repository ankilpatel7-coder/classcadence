// How far ahead sessions are materialized.
//
// This is the ceiling on everything that browses the future schedule — most
// importantly the make-up picker, which can only offer sessions that already
// exist in the table. At 14 days a twice-weekly student had ~4 upcoming
// classes, so a make-up effectively could only be booked in the same week.
// 35 days keeps a full 4 weeks visible with a week of slack.
export const MATERIALIZE_HORIZON_DAYS = 35;

// How far ahead the make-up picker lists candidate sessions. Capped by the
// materialization horizon above — asking for more just returns nothing extra.
export const MAKEUP_PICKER_HORIZON_DAYS = 28;
