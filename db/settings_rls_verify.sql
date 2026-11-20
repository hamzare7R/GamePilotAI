-- GamePilotAI — Settings RLS verification
--
-- Run AFTER db/settings_rls_schema.sql, as one batch in the Neon SQL Editor.
--
-- Section 1 is read-only (catalog inspection).
-- Section 2 writes ONLY to the three new tables and ends with ROLLBACK.
-- Do NOT run it statement-by-statement in autocommit mode.
-- The functional test expects the two chosen users to have no rows yet in the
-- new tables (true right after creation); otherwise it aborts safely.

-- ---------------------------------------------------------------------------
-- 1. Structure, policies, role attributes, untouched existing tables
-- ---------------------------------------------------------------------------
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN ('user_profiles', 'user_preferences', 'user_notification_preferences')
 ORDER BY c.relname;

SELECT tablename, policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('user_profiles', 'user_preferences', 'user_notification_preferences')
 ORDER BY tablename, policyname;

-- Both rolsuper and rolbypassrls MUST be false, otherwise RLS is bypassed.
SELECT current_user AS db_role, rolsuper, rolbypassrls
  FROM pg_roles
 WHERE rolname = current_user;

-- Existing tables must still have RLS disabled (no change was made to them).
SELECT c.relname AS existing_table,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN ('users', 'user_sessions', 'user_library_entries')
 ORDER BY c.relname;

-- ---------------------------------------------------------------------------
-- 2. Two-user isolation test (all writes are rolled back)
-- ---------------------------------------------------------------------------
BEGIN;

DO $$
DECLARE
  ua text;
  ub text;
  n integer;
BEGIN
  SELECT id INTO ua FROM public.users ORDER BY created_at, id LIMIT 1;
  SELECT id INTO ub FROM public.users WHERE id <> ua ORDER BY created_at, id LIMIT 1;

  IF ua IS NULL OR ub IS NULL THEN
    RAISE EXCEPTION 'Isolation test needs at least two rows in public.users';
  END IF;

  -- ----- A must not INSERT a row owned by B (run before any rows exist, so a
  --       unique/PK violation cannot mask the RLS failure) -----
  PERFORM set_config('app.user_id', ua, true);

  BEGIN
    INSERT INTO public.user_profiles (user_id, bio) VALUES (ub, 'spoofed');
    RAISE EXCEPTION 'RLS FAIL: A inserted a profile row for B';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected: new row violates row-level security policy
  END;

  BEGIN
    INSERT INTO public.user_preferences (user_id) VALUES (ub);
    RAISE EXCEPTION 'RLS FAIL: A inserted a preferences row for B';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.user_notification_preferences (user_id) VALUES (ub);
    RAISE EXCEPTION 'RLS FAIL: A inserted a notification row for B';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  -- ----- User A writes own rows -----
  INSERT INTO public.user_profiles (user_id, bio, platforms, favorite_genres)
  VALUES (ua, 'isolation-test A', ARRAY['pc'], ARRAY['rpg']);

  INSERT INTO public.user_preferences (user_id, language, theme)
  VALUES (ua, 'en', 'dark');

  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (ua);

  -- ----- User B writes own rows -----
  PERFORM set_config('app.user_id', ub, true);

  INSERT INTO public.user_profiles (user_id, bio)
  VALUES (ub, 'isolation-test B');

  INSERT INTO public.user_preferences (user_id, language, theme)
  VALUES (ub, 'de', 'system');

  INSERT INTO public.user_notification_preferences (user_id, weekly_report)
  VALUES (ub, false);

  -- ----- A must not READ B -----
  PERFORM set_config('app.user_id', ua, true);

  SELECT count(*) INTO n FROM public.user_profiles WHERE user_id = ub;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: A can read B profile'; END IF;

  SELECT count(*) INTO n FROM public.user_preferences WHERE user_id = ub;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: A can read B preferences'; END IF;

  SELECT count(*) INTO n FROM public.user_notification_preferences WHERE user_id = ub;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: A can read B notifications'; END IF;

  -- ----- A must not UPDATE B -----
  UPDATE public.user_profiles SET bio = 'tampered' WHERE user_id = ub;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: A updated B profile'; END IF;

  UPDATE public.user_preferences SET language = 'en' WHERE user_id = ub;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: A updated B preferences'; END IF;

  -- ----- A must not DELETE B -----
  DELETE FROM public.user_notification_preferences WHERE user_id = ub;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: A deleted B notifications'; END IF;

  -- ----- Positive controls: A still owns and can update own row -----
  SELECT count(*) INTO n FROM public.user_profiles WHERE user_id = ua;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS FAIL: A lost access to own profile'; END IF;

  UPDATE public.user_profiles SET bio = 'isolation-test A v2' WHERE user_id = ua;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS FAIL: A cannot update own profile'; END IF;

  -- ----- B data is unchanged from B's point of view -----
  PERFORM set_config('app.user_id', ub, true);

  SELECT count(*) INTO n FROM public.user_profiles WHERE user_id = ub;
  IF n <> 1 THEN RAISE EXCEPTION 'RLS FAIL: B lost access to own profile'; END IF;

  SELECT count(*) INTO n
    FROM public.user_profiles
   WHERE user_id = ub AND bio = 'isolation-test B';
  IF n <> 1 THEN RAISE EXCEPTION 'RLS FAIL: A altered B profile data'; END IF;

  RAISE NOTICE 'RLS isolation checks passed for % vs %', ua, ub;
END $$;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- 3. Fail-closed check after rollback: no identity -> no rows
-- ---------------------------------------------------------------------------
SELECT current_setting('app.user_id', true) AS identity_after_rollback;
SELECT count(*) AS visible_rows_without_identity FROM public.user_profiles;
