-- P02c follow-up: enforce that a single applicant can hold at most one
-- booked viewing slot at any time.
--
-- Why: /api/book-viewing performs a pre-claim "already_booked" check
-- followed by an atomic PATCH, but the two are not in a single transaction.
-- Without this index, two concurrent tabs for the same applicant can each
-- claim a different slot. Greptile flagged this as P1 on PR #1.
--
-- The index is a partial unique index on applicant_id where status='booked'.
-- Any UPDATE (or INSERT) that would cause a second booked row with the same
-- applicant_id will fail with a unique-violation, which the API surfaces as
-- `slot_taken`. Rows where status <> 'booked' are not indexed, so the
-- available / held workflow is unaffected.
--
-- How to apply (Supabase Studio):
--   1. Dashboard -> SQL Editor -> New query
--   2. Paste the statement below and Run
--   3. Confirm the index is present under Database -> Indexes for viewing_slots
--
-- Rollback:
--   DROP INDEX IF EXISTS viewing_slots_one_booked_per_applicant;

CREATE UNIQUE INDEX IF NOT EXISTS viewing_slots_one_booked_per_applicant
  ON public.viewing_slots (applicant_id)
  WHERE status = 'booked';
