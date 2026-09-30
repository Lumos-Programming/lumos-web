-- Drain pending events with the previous application version before upgrading.
-- This named CHECK aborts the migration batch without discarding old payloads.
CREATE TABLE migration_outbox_upgrade_guard (
  pending INTEGER NOT NULL
    CONSTRAINT migration_outbox_must_be_drained_before_upgrade CHECK (pending = 0)
);
INSERT INTO migration_outbox_upgrade_guard (pending)
  SELECT COUNT(*) FROM migration_outbox;
DROP TABLE migration_outbox_upgrade_guard;

DROP TABLE migration_outbox;
CREATE TABLE migration_outbox (
  id TEXT PRIMARY KEY NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('firestore', 'd1')),
  created_at INTEGER NOT NULL,
  chunk_count INTEGER NOT NULL CHECK (chunk_count > 0)
);
CREATE INDEX migration_outbox_pending ON migration_outbox (created_at, id);

CREATE TABLE migration_outbox_chunks (
  event_id TEXT NOT NULL REFERENCES migration_outbox(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  payload TEXT NOT NULL,
  PRIMARY KEY (event_id, ordinal)
);
