-- Migration 006: Email Authentication and Full Name Profile Integration

-- 1. Modify public.users: make phone optional, add email and email_verified_at
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email varchar(255) UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email_verified_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);

-- 2. Update handle_new_auth_user() to support both email and phone signup with full_name
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name text;
BEGIN
  v_full_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');

  IF NEW.email IS NOT NULL OR NEW.phone IS NOT NULL THEN
    INSERT INTO public.users(
      id,
      email,
      phone,
      full_name,
      email_verified_at,
      phone_verified_at,
      status
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.phone,
      COALESCE(v_full_name, 'لاعب ملاعبي'),
      NEW.email_confirmed_at,
      NEW.phone_confirmed_at,
      'active'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.users.phone),
      full_name = COALESCE(v_full_name, public.users.full_name),
      email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
      phone_verified_at = COALESCE(EXCLUDED.phone_verified_at, public.users.phone_verified_at),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Ensure trigger on auth.users tracks insert and updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email, email_confirmed_at, phone, phone_confirmed_at, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 4. Backfill any existing auth users
INSERT INTO public.users(id, email, phone, full_name, email_verified_at, phone_verified_at, status)
SELECT
  id,
  email,
  phone,
  COALESCE(NULLIF(trim(raw_user_meta_data->>'full_name'), ''), 'لاعب ملاعبي'),
  email_confirmed_at,
  phone_confirmed_at,
  'active'
FROM auth.users
WHERE email IS NOT NULL OR phone IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  phone = COALESCE(EXCLUDED.phone, public.users.phone),
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
  phone_verified_at = COALESCE(EXCLUDED.phone_verified_at, public.users.phone_verified_at),
  updated_at = now();
