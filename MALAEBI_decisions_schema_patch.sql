-- MALAEBI decision alignment patch
-- Apply to the reviewed v2 draft before generating formal migrations.
-- Approval request: 10 minutes; instant hold: 5 minutes; player cancellation cutoff: 6 hours.
-- The application must set expires_at using server time and persist policy snapshots.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS external_customer_name varchar(160),
  ADD COLUMN IF NOT EXISTS external_customer_phone varchar(20),
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_actor_type varchar(20)
    CHECK (cancellation_actor_type IS NULL OR cancellation_actor_type IN ('player','venue','admin','system'));

-- Standard MVP timeouts. Store actual computed expires_at on each held/pending booking.
-- These values are policy defaults, not client-configurable values.
COMMENT ON COLUMN bookings.expires_at IS
  'Server-computed expiry: 10 minutes for approval requests; 5 minutes for instant holds.';
COMMENT ON COLUMN bookings.policy_snapshot IS
  'Immutable policy snapshot including cancellation_cutoff_hours=6 and refund rules at booking time.';

CREATE INDEX IF NOT EXISTS bookings_expiring_idx
  ON bookings(status, expires_at)
  WHERE status IN ('held','pending');

CREATE INDEX IF NOT EXISTS bookings_external_phone_idx
  ON bookings(external_customer_phone)
  WHERE source='external' AND external_customer_phone IS NOT NULL;

-- Required transactional service behavior:
-- A) approval request: status=pending, expires_at=now()+interval '10 minutes';
-- B) instant hold: status=held, expires_at=now()+interval '5 minutes';
-- C) expiry worker: lock booking row; if still held/pending and expires_at<=now(),
--    set status='expired' and linked field_occupancies.status='released' atomically.
-- D) player cancellation is free iff starts_at - server_now >= interval '6 hours'.
-- E) venue cancellation of a confirmed paid booking creates full refund workflow.
-- F) external booking: source='external'; player_user_id may be NULL; optional contact fields;
--    actor is mandatory in audit_logs.
-- G) Late payment webhook after expiry must never reactivate the booking.
