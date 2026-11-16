
-- Supabase Auth owns OTP, sessions, refresh-token rotation and revocation.
-- This project stores idempotency records only; identity is synchronized from auth.users.
CREATE TABLE IF NOT EXISTS idempotency_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 key varchar(160) NOT NULL,
 request_hash text NOT NULL,
 response_json jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,key)
);
