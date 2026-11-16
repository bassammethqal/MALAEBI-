CREATE OR REPLACE FUNCTION public.assert_booking_has_occupancy()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.field_occupancies o WHERE o.booking_id=NEW.id) THEN
  RAISE EXCEPTION 'booking % must have exactly one field occupancy',NEW.id USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS booking_requires_occupancy ON public.bookings;
CREATE CONSTRAINT TRIGGER booking_requires_occupancy
AFTER INSERT ON public.bookings DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.assert_booking_has_occupancy();

CREATE OR REPLACE FUNCTION public.assert_booking_occupancy_type()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_type text;
BEGIN
 IF NEW.occupancy_type='booking' THEN
  SELECT source INTO source_type FROM public.bookings WHERE id=NEW.booking_id;
  IF source_type IS NULL THEN
   RAISE EXCEPTION 'booking occupancy references missing booking %',NEW.booking_id USING ERRCODE='23503';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS occupancy_booking_integrity ON public.field_occupancies;
CREATE TRIGGER occupancy_booking_integrity
BEFORE INSERT OR UPDATE OF booking_id,occupancy_type ON public.field_occupancies
FOR EACH ROW EXECUTE FUNCTION public.assert_booking_occupancy_type();
