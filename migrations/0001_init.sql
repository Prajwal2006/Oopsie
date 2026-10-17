-- Oopsie Woopsie initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE apologies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE,
  manage_token_hash  text NOT NULL UNIQUE,
  vibe               text NOT NULL CHECK (vibe IN ('friend', 'partner', 'crush', 'situationship')),
  sender_name        text NOT NULL,
  recipient_name     text NOT NULL,
  message            text NOT NULL CHECK (char_length(message) <= 600),
  theme_config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  creator_timezone   text NOT NULL,
  meeting_format     text NOT NULL CHECK (meeting_format IN ('call', 'video', 'coffee', 'walk', 'text')),
  meeting_details    text,
  allow_opt_out      boolean NOT NULL DEFAULT true,
  status             text NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created', 'opened', 'yes', 'booked', 'needs_space')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX apologies_expires_at_idx ON apologies (expires_at);

CREATE TABLE availability_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apology_id  uuid NOT NULL REFERENCES apologies(id) ON DELETE CASCADE,
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  CHECK (ends_at > starts_at),
  UNIQUE (apology_id, starts_at)
);

CREATE TABLE bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apology_id      uuid NOT NULL REFERENCES apologies(id) ON DELETE CASCADE,
  slot_id         uuid NOT NULL UNIQUE REFERENCES availability_slots(id) ON DELETE CASCADE,
  guest_name      text NOT NULL,
  contact_method  text CHECK (contact_method IN ('phone', 'email', 'handle')),
  contact_value   text,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- One conversation per apology.
CREATE UNIQUE INDEX bookings_one_per_apology ON bookings (apology_id);

CREATE TABLE events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  apology_id  uuid NOT NULL REFERENCES apologies(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('opened', 'no_dodge', 'yes_clicked', 'booked', 'opted_out')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_apology_id_idx ON events (apology_id, type);

-- Fixed-window rate limiting. Keys are hashed (never raw IPs).
CREATE TABLE rate_limits (
  key           text NOT NULL,
  window_start  timestamptz NOT NULL,
  count         integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
