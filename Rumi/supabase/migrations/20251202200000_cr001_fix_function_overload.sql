-- CR-001 Fix: Remove old auth_create_otp function to resolve overloading ambiguity
-- The previous migration added new params but didn't drop the old 4-param version

DROP FUNCTION IF EXISTS public.auth_create_otp(UUID, TEXT, TEXT, TIMESTAMPTZ);
