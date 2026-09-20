-- Explicit application tables; tombstones prevent stale backfills from resurrecting deletes.

CREATE TABLE "members" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "discord_username" TEXT,
  "discord_handle" TEXT,
  "discord_avatar" TEXT,
  "student_id" TEXT,
  "nickname" TEXT,
  "last_name" TEXT,
  "first_name" TEXT,
  "last_name_romaji" TEXT,
  "first_name_romaji" TEXT,
  "bio" TEXT,
  "role" TEXT,
  "member_type" TEXT,
  "current_org" TEXT,
  "birth_date" TEXT,
  "gender" TEXT,
  "github" TEXT,
  "github_id" TEXT,
  "github_avatar" TEXT,
  "x" TEXT,
  "x_id" TEXT,
  "x_avatar" TEXT,
  "line" TEXT,
  "line_id" TEXT,
  "line_avatar" TEXT,
  "linkedin" TEXT,
  "line_access_token" TEXT,
  "line_refresh_token" TEXT,
  "face_image" TEXT,
  "banner_image" TEXT,
  "custom_public_image" TEXT,
  "public_image_option" TEXT,
  "ring_color" TEXT,
  "sub_account_discord_id" TEXT,
  "primary_discord_id" TEXT,
  "line_linked_at" REAL,
  "line_token_expires_at" REAL,
  "allow_public" INTEGER,
  "is_sub_account" INTEGER,
  "onboarding_completed" INTEGER,
  "opted_out" INTEGER,
  "opted_out_at" REAL,
  "last_login_at" REAL,
  "created_at" REAL,
  "updated_at" REAL,
  "linked_at" REAL,
  "year_by_fiscal" TEXT,
  "enrollments" TEXT,
  "interests" TEXT,
  "top_interests" TEXT,
  "visibility" TEXT
);

CREATE TABLE "blogs" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "author_id" TEXT,
  "url" TEXT,
  "title" TEXT,
  "published_at" TEXT,
  "description" TEXT,
  "thumbnail_url" TEXT,
  "platform" TEXT,
  "created_at" REAL
);

CREATE TABLE "news" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "date" TEXT,
  "title" TEXT,
  "summary" TEXT,
  "body" TEXT,
  "image" TEXT,
  "category" TEXT,
  "status" TEXT,
  "author_id" TEXT,
  "published_at" REAL,
  "created_at" REAL,
  "updated_at" REAL
);

CREATE TABLE "weeks" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "week_string" TEXT,
  "event_start_time" TEXT,
  "discord_event_id" TEXT,
  "discord_event_url" TEXT,
  "talks" TEXT
);

CREATE TABLE "line_invitations" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "user_id" TEXT,
  "line_id" TEXT,
  "pending_line" TEXT,
  "pending_line_id" TEXT,
  "pending_line_avatar" TEXT,
  "pending_line_access_token" TEXT,
  "pending_line_refresh_token" TEXT,
  "pending_line_token_expires_at" REAL,
  "used" INTEGER,
  "created_at" REAL,
  "expires_at" REAL
);

CREATE TABLE "optout_submissions" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "discord_id" TEXT,
  "kind" TEXT,
  "user_agent" TEXT,
  "ip_hash" TEXT,
  "confirmed_at" REAL
);

CREATE TABLE "survey_optout" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "discord_id" TEXT,
  "reason" TEXT,
  "reason_detail" TEXT,
  "created_at" REAL,
  "updated_at" REAL,
  "confirmed_at" REAL
);

CREATE TABLE "surveys" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "discord_id" TEXT,
  "type" TEXT,
  "satisfaction_reason" TEXT,
  "expectations" TEXT,
  "satisfaction" REAL,
  "created_at" REAL
);

CREATE TABLE "events" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "title" TEXT,
  "description" TEXT,
  "date" TEXT,
  "location" TEXT
);

CREATE TABLE "system" (
  id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  present_fields TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(present_fields)),
  timestamp_values TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(timestamp_values)),
  extra_fields TEXT NOT NULL DEFAULT '["object",[]]' CHECK (json_valid(extra_fields)),
  "last_run_at" REAL
);

CREATE INDEX members_public ON members (onboarding_completed, allow_public) WHERE deleted = 0;
CREATE INDEX members_line ON members (line_id) WHERE deleted = 0;
CREATE INDEX blogs_author ON blogs (author_id) WHERE deleted = 0;
CREATE INDEX blogs_published ON blogs (published_at DESC) WHERE deleted = 0;
CREATE INDEX news_published ON news (status, published_at DESC) WHERE deleted = 0;
CREATE INDEX invitations_user_unused ON line_invitations (user_id, used) WHERE deleted = 0;
CREATE INDEX invitations_line_unused ON line_invitations (line_id, used) WHERE deleted = 0;
CREATE INDEX optout_kind ON optout_submissions (kind) WHERE deleted = 0;
CREATE INDEX events_date ON events (date DESC) WHERE deleted = 0;

-- A failed read check aborts the complete D1 batch before any changes commit.
CREATE TABLE migration_guard (
  value INTEGER NOT NULL CONSTRAINT migration_revision_matches CHECK (value = 1)
);

-- Full committed images make retries deterministic, including field removal.
CREATE TABLE migration_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('firestore', 'd1')),
  created_at INTEGER NOT NULL,
  documents TEXT NOT NULL CHECK (json_valid(documents))
);
CREATE INDEX migration_outbox_pending ON migration_outbox (created_at, id);
