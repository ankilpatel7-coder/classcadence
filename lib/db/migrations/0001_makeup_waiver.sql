-- Make-up waiver: let staff record "this absence gets no make-up".
--
-- Distinct from makeup_offers.state = 'declined', which means an offer WAS
-- made and the parent turned it down. A waiver means no offer is ever sent;
-- the absence just drops out of the "Needs a make-up" queue.
--
-- Additive and nullable, so it is safe to apply to a live database.

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS makeup_waived_at     timestamptz,
  ADD COLUMN IF NOT EXISTS makeup_waived_by     uuid REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS makeup_waived_reason text;

-- Only waived rows are ever filtered on, so keep the index partial and small.
CREATE INDEX IF NOT EXISTS attendance_makeup_waived_idx
  ON public.attendance_records (makeup_waived_at)
  WHERE makeup_waived_at IS NOT NULL;
