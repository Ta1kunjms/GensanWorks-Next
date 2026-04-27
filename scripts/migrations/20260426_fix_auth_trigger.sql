-- Migration: Fix Auth Trigger for User Metadata Mapping
-- Date: 2026-04-26
-- Description: Ensures that first_name, last_name, and establishment_name are correctly 
-- mapped from Supabase Auth metadata to the public tables.

-- 1. Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_establishment_name TEXT;
BEGIN
  -- Extract metadata
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'jobseeker');
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_establishment_name := NEW.raw_user_meta_data->>'establishment_name';

  -- Fallbacks for name if missing
  IF v_first_name IS NULL AND v_full_name IS NOT NULL THEN
    v_first_name := split_part(v_full_name, ' ', 1);
  END IF;
  
  IF v_last_name IS NULL AND v_full_name IS NOT NULL THEN
    v_last_name := substring(v_full_name from position(' ' in v_full_name) + 1);
  END IF;

  -- Ensure we don't have NULL for NOT NULL columns
  v_first_name := COALESCE(v_first_name, 'User');
  v_last_name := COALESCE(v_last_name, '');

  IF (v_role = 'jobseeker') THEN
    INSERT INTO public.jobseekers (id, email, first_name, last_name, password_hash)
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      'auth_managed'
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = now();
      
  ELSIF (v_role = 'employer') THEN
    INSERT INTO public.employers (id, email, establishment_name, contact_person, password_hash)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(v_establishment_name, 'Unnamed Employer'),
      COALESCE(v_full_name, v_first_name),
      'auth_managed'
    )
    ON CONFLICT (id) DO UPDATE SET
      establishment_name = EXCLUDED.establishment_name,
      contact_person = EXCLUDED.contact_person,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
