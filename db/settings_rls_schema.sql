-- GamePilotAI — Settings database preparation
--
-- Scope: NEW tables only (user_profiles, user_preferences,
-- user_notification_preferences) plus their own constraints, indexes and RLS
-- policies.
--
-- Explicitly NOT touched: users, user_sessions, user_library_entries,
-- gmail_* tables, any existing row, any existing policy or role.
--
-- Run once in the Neon SQL Editor as the database owner (e.g. neondb_owner),
-- pasting the whole file as a single batch. Everything runs inside one
-- transaction, so any failure rolls the whole package back.
--
-- RLS identity contract used by the future Settings API:
--   every request must run its settings queries on ONE pooled client inside a
--   transaction that executes
--     SELECT set_config('app.user_id', $1, true);   -- true = transaction-local
--   where $1 comes from the verified server session, never from the browser.
--   Session-level settings (set_config(..., false) or plain SET) are forbidden
--   because the pool reuses connections across users.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Profile extras (identity fields stay in users: id, email, display_name)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  avatar_url text,
  bio text NOT NULL DEFAULT '',
  platforms text[] NOT NULL DEFAULT '{}'::text[],
  favorite_genres text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_avatar_url_length
    CHECK (avatar_url IS NULL OR char_length(avatar_url) BETWEEN 1 AND 2048),
  CONSTRAINT user_profiles_bio_length
    CHECK (char_length(bio) <= 500),
  CONSTRAINT user_profiles_platforms_allowed
    CHECK (platforms <@ ARRAY['pc', 'playstation', 'xbox', 'switch', 'android', 'ios', 'cloud']::text[]),
  CONSTRAINT user_profiles_platforms_count
    CHECK (cardinality(platforms) <= 7),
  CONSTRAINT user_profiles_genres_allowed
    CHECK (
      favorite_genres <@ ARRAY[
        'action', 'adventure', 'rpg', 'shooter', 'strategy', 'sports', 'racing',
        'simulation', 'horror', 'puzzle', 'mmo', 'indie', 'survival',
        'open-world', 'multiplayer', 'other'
      ]::text[]
    ),
  CONSTRAINT user_profiles_genres_count
    CHECK (cardinality(favorite_genres) <= 16)
);

-- ---------------------------------------------------------------------------
-- 2. Language and appearance
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_preferences (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  theme text NOT NULL DEFAULT 'dark',
  reduce_motion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_language_format
    CHECK (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  CONSTRAINT user_preferences_theme_allowed
    CHECK (theme IN ('dark', 'light', 'system'))
);

-- ---------------------------------------------------------------------------
-- 3. Notification preferences
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_notification_preferences (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  product_updates boolean NOT NULL DEFAULT true,
  weekly_report boolean NOT NULL DEFAULT true,
  coaching_reminders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The primary key on user_id is the access path used by every RLS predicate,
-- so no additional indexes are created (no current query filters by other
-- columns).

-- ---------------------------------------------------------------------------
-- 4. Row Level Security: enabled AND forced so the table owner is also
--    subject to policies. Without FORCE, the owner bypasses RLS entirely.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_profiles FROM PUBLIC;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_preferences FROM PUBLIC;

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_notification_preferences FROM PUBLIC;

-- A single FOR ALL policy per table covers SELECT (USING), DELETE (USING),
-- INSERT (WITH CHECK) and UPDATE (USING + WITH CHECK). The WITH CHECK clause
-- of UPDATE also prevents moving a row to a different user_id.
-- NULLIF(..., '') makes an unset identity fail closed: the comparison yields
-- NULL, so no row is visible and no insert/update is accepted.

CREATE POLICY user_profiles_own_rows ON public.user_profiles
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));

CREATE POLICY user_preferences_own_rows ON public.user_preferences
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));

CREATE POLICY user_notification_preferences_own_rows ON public.user_notification_preferences
  FOR ALL
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));

COMMIT;

-- If the application connects with a role other than the table owner, grant it
-- DML on these three tables only, and make sure that role is neither superuser
-- nor BYPASSRLS:
--   GRANT SELECT, INSERT, UPDATE, DELETE
--     ON public.user_profiles, public.user_preferences, public.user_notification_preferences
--     TO <app_role>;
