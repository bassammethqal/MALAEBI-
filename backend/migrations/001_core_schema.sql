-- MALAEBI detailed PostgreSQL schema draft v2
-- Target: PostgreSQL 14+. This is a reviewed design draft, not production migration.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE booking_status AS ENUM
 ('held','pending','confirmed','completed','cancelled','rejected','expired','no_show','disputed');
CREATE TYPE confirmation_mode AS ENUM ('instant','approval');
CREATE TYPE deposit_mode AS ENUM ('none','fixed','percentage');
CREATE TYPE occupancy_type AS ENUM ('booking','maintenance','private_block','external_block');
CREATE TYPE occupancy_status AS ENUM ('active','released');
CREATE TYPE venue_role AS ENUM ('owner','manager','receptionist');

CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 phone varchar(20) NOT NULL UNIQUE,
 full_name varchar(160),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','deleted')),
 phone_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE governorates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(120) NOT NULL UNIQUE
);
CREATE TABLE districts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 governorate_id uuid NOT NULL REFERENCES governorates(id),
 name varchar(120) NOT NULL,
 UNIQUE(governorate_id,name)
);
CREATE TABLE areas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 district_id uuid NOT NULL REFERENCES districts(id),
 name varchar(120) NOT NULL,
 UNIQUE(district_id,name)
);

CREATE TABLE venues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id uuid NOT NULL REFERENCES users(id),
 area_id uuid REFERENCES areas(id),
 name varchar(180) NOT NULL,
 description text,
 address_text text,
 latitude numeric(10,7),
 longitude numeric(10,7),
 phone varchar(20),
 status varchar(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','rejected','suspended','archived')),
 verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venues_area_status_idx ON venues(area_id,status);

CREATE TABLE venue_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id),
 role venue_role NOT NULL,
 permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('invited','active','suspended','revoked')),
 invited_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,user_id)
);
CREATE INDEX venue_members_user_status_idx ON venue_members(user_id,status);

CREATE TABLE fields (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
 name varchar(160) NOT NULL,
 sport_type varchar(30) NOT NULL DEFAULT 'football' CHECK(sport_type IN ('football')),
 description text,
 capacity smallint CHECK(capacity IS NULL OR capacity>0),
 surface_type varchar(40),
 status varchar(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','maintenance','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(venue_id,name)
);
CREATE INDEX fields_venue_status_idx ON fields(venue_id,status);

CREATE TABLE venue_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
 image_url text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE field_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
 image_url text NOT NULL,
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE amenities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name varchar(100) NOT NULL UNIQUE,
 icon_key varchar(80)
);
CREATE TABLE field_amenities (
 field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
 amenity_id uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
 PRIMARY KEY(field_id,amenity_id)
);

CREATE TABLE opening_hours (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
 weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6),
 opens_at time,
 closes_at time,
 is_closed boolean NOT NULL DEFAULT false,
 CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at>opens_at)),
 UNIQUE(field_id,weekday,opens_at)
);

CREATE TABLE pricing_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
 weekday smallint CHECK(weekday BETWEEN 0 AND 6),
 starts_at time NOT NULL,
 ends_at time NOT NULL,
 price numeric(12,2) NOT NULL CHECK(price>=0),
 currency char(3) NOT NULL DEFAULT 'YER',
 priority smallint NOT NULL DEFAULT 0,
 active boolean NOT NULL DEFAULT true,
 CHECK(ends_at>starts_at)
);
CREATE INDEX pricing_rules_lookup_idx ON pricing_rules(field_id,weekday,active,priority);

CREATE TABLE booking_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 field_id uuid NOT NULL UNIQUE REFERENCES fields(id) ON DELETE CASCADE,
 confirmation_mode confirmation_mode NOT NULL DEFAULT 'approval',
 deposit_mode deposit_mode NOT NULL DEFAULT 'none',
 deposit_value numeric(12,2),
 deposit_enabled boolean NOT NULL DEFAULT false,
 instant_booking_enabled boolean NOT NULL DEFAULT false,
 CHECK((deposit_mode='none' AND deposit_enabled=false AND deposit_value IS NULL)
    OR (deposit_mode<>'none' AND deposit_enabled=true AND deposit_value IS NOT NULL AND deposit_value>0)),
 CHECK(deposit_mode<>'percentage' OR deposit_value<=100),
 CHECK(NOT instant_booking_enabled OR confirmation_mode='instant')
);

-- One canonical occupancy table for all occupied periods:
-- booking rows (including external bookings) and operational blocks share the same overlap constraint.
CREATE TABLE field_occupancies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 field_id uuid NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 occupancy_type occupancy_type NOT NULL,
 status occupancy_status NOT NULL DEFAULT 'active',
 booking_id uuid UNIQUE,
 reason varchar(240),
 created_by uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at),
 CHECK((occupancy_type='booking' AND booking_id IS NOT NULL AND reason IS NULL)
    OR (occupancy_type<>'booking' AND booking_id IS NULL))
);
ALTER TABLE field_occupancies ADD CONSTRAINT field_occupancies_no_overlap
 EXCLUDE USING gist (
   field_id WITH =,
   tstzrange(starts_at,ends_at,'[)') WITH &&
 ) WHERE (status='active');
CREATE INDEX field_occupancies_field_start_idx ON field_occupancies(field_id,starts_at);

CREATE TABLE bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_no varchar(32) NOT NULL UNIQUE,
 player_user_id uuid REFERENCES users(id),
 status booking_status NOT NULL DEFAULT 'pending',
 source varchar(20) NOT NULL DEFAULT 'app' CHECK(source IN ('app','external','admin')),
 duration_minutes smallint NOT NULL DEFAULT 60 CHECK(duration_minutes=60),
 total_price numeric(12,2) NOT NULL CHECK(total_price>=0),
 currency char(3) NOT NULL DEFAULT 'YER',
 deposit_required numeric(12,2) NOT NULL DEFAULT 0 CHECK(deposit_required>=0),
 deposit_paid numeric(12,2) NOT NULL DEFAULT 0 CHECK(deposit_paid>=0),
 remaining_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK(remaining_amount>=0),
 price_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 confirmation_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 expires_at timestamptz,
 confirmed_at timestamptz,
 cancelled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(deposit_paid<=total_price),
 CHECK(deposit_required<=total_price)
);
CREATE INDEX bookings_player_created_idx ON bookings(player_user_id,created_at DESC);
CREATE INDEX bookings_status_expiry_idx ON bookings(status,expires_at);

-- Occupancy.booking_id references bookings. Insert booking then occupancy in one transaction.
ALTER TABLE field_occupancies ADD CONSTRAINT field_occupancies_booking_fk
 FOREIGN KEY(booking_id) REFERENCES bookings(id);

CREATE TABLE payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES bookings(id),
 payment_type varchar(20) NOT NULL CHECK(payment_type IN ('deposit','remaining','full')),
 amount numeric(12,2) NOT NULL CHECK(amount>0),
 currency char(3) NOT NULL DEFAULT 'YER',
 provider varchar(80),
 provider_reference varchar(180),
 status varchar(20) NOT NULL DEFAULT 'initiated' CHECK(status IN ('initiated','pending','succeeded','failed','cancelled','refunded','partially_refunded')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking_idx ON payments(booking_id);

CREATE TABLE payment_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 payment_id uuid NOT NULL REFERENCES payments(id),
 provider_event_id varchar(180) NOT NULL UNIQUE,
 event_type varchar(80) NOT NULL,
 payload jsonb NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 payment_id uuid NOT NULL REFERENCES payments(id),
 amount numeric(12,2) NOT NULL CHECK(amount>0),
 status varchar(20) NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','approved','processing','succeeded','failed','rejected')),
 reason text,
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
 player_user_id uuid NOT NULL REFERENCES users(id),
 rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text,
 status varchar(20) NOT NULL DEFAULT 'published' CHECK(status IN ('published','hidden','flagged')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE disputes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES bookings(id),
 opened_by uuid NOT NULL REFERENCES users(id),
 status varchar(24) NOT NULL DEFAULT 'open' CHECK(status IN ('open','under_review','resolved','rejected')),
 details text,
 resolution text,
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE TABLE notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 channel varchar(20) NOT NULL CHECK(channel IN ('in_app','sms','whatsapp','email','push')),
 title varchar(180) NOT NULL,
 body text NOT NULL,
 status varchar(20) NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','failed','read')),
 sent_at timestamptz,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_created_idx ON notifications(user_id,created_at DESC);

CREATE TABLE audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid REFERENCES users(id),
 venue_id uuid REFERENCES venues(id),
 action varchar(100) NOT NULL,
 entity_type varchar(80),
 entity_id uuid,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_venue_created_idx ON audit_logs(venue_id,created_at DESC);

-- IMPORTANT TRANSACTION RULES (implemented in service layer / DB transaction):
-- 1. Create booking + field_occupancy in one transaction.
-- 2. For booking occupancy, set field_occupancies.booking_id to the new booking id.
-- 3. Insert/update occupancy status and booking status atomically.
-- 4. For a cancellation/expiry, set occupancy.status='released' in the same transaction.
-- 5. Never trust client-side availability; exclusion constraint is the final concurrency guard.
-- 6. Approval-request expiry policy and instant hold duration remain product decisions.
-- 7. Enforce that every booking gets exactly one occupancy in the same transaction; add a
--    deferred constraint trigger before production if DB-level enforcement is required.
