-- Safe to re-run on preview / main (apply by hand per docs/environments.md).

DO $$ BEGIN
  ALTER TYPE rsvp ADD VALUE IF NOT EXISTS 'requested';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  href text,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS trip_members_requested_idx
  ON trip_members (trip_id) WHERE rsvp = 'requested';
