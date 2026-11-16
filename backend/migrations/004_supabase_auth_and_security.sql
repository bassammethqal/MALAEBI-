CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.phone IS NOT NULL THEN
  INSERT INTO public.users(id,phone,phone_verified_at,status)
  VALUES(NEW.id,NEW.phone,NEW.phone_confirmed_at,'active')
  ON CONFLICT(id) DO UPDATE SET phone=EXCLUDED.phone,
   phone_verified_at=COALESCE(EXCLUDED.phone_verified_at,public.users.phone_verified_at),updated_at=now();
 END IF;
 RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF phone,phone_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.users(id,phone,phone_verified_at,status)
SELECT id,phone,phone_confirmed_at,'active' FROM auth.users WHERE phone IS NOT NULL
ON CONFLICT(id) DO UPDATE SET phone=EXCLUDED.phone,
 phone_verified_at=COALESCE(EXCLUDED.phone_verified_at,public.users.phone_verified_at),updated_at=now();

DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['users','governorates','districts','areas','venues','venue_members','venue_images','fields','field_images',
 'amenities','field_amenities','opening_hours','pricing_rules','booking_settings','field_occupancies',
 'bookings','payments','payment_events','refunds','reviews','disputes','notifications','audit_logs','idempotency_keys']
 LOOP
  IF to_regclass('public.'||t) IS NOT NULL THEN
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated',t);
  END IF;
 END LOOP;
END $$;

DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='users_auth_user_fk') THEN
  ALTER TABLE public.users ADD CONSTRAINT users_auth_user_fk
  FOREIGN KEY(id) REFERENCES auth.users(id) ON DELETE CASCADE;
 END IF;
END $$;
