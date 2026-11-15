import { ensureUserSchema } from "@/server/auth/user";
import { getPool } from "@/server/db/pool";

const CREATE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS gmail_connections (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_address text NOT NULL,
    encrypted_refresh_token text NOT NULL,
    connection_status text NOT NULL DEFAULT 'active',
    history_id text,
    watch_expiration timestamptz,
    last_sync_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT gmail_connections_user_unique UNIQUE (user_id),
    CONSTRAINT gmail_connections_email_unique UNIQUE (email_address)
  );

  CREATE TABLE IF NOT EXISTS gmail_notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id text NOT NULL REFERENCES gmail_connections(id) ON DELETE CASCADE,
    gmail_message_id text NOT NULL,
    sender_domain text NOT NULL DEFAULT '',
    sender_address text NOT NULL DEFAULT '',
    service_name text NOT NULL DEFAULT 'other',
    message_category text NOT NULL DEFAULT 'unknown_sender',
    received_at timestamptz,
    processing_status text NOT NULL DEFAULT 'processed',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT gmail_notifications_message_unique UNIQUE (connection_id, gmail_message_id)
  );

  CREATE INDEX IF NOT EXISTS gmail_notifications_user_received_idx
    ON gmail_notifications (user_id, received_at DESC NULLS LAST);

  CREATE TABLE IF NOT EXISTS gmail_sync_events (
    id text PRIMARY KEY,
    connection_id text REFERENCES gmail_connections(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    status text NOT NULL,
    error_code text,
    pubsub_message_id text,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS gmail_sync_events_connection_idx
    ON gmail_sync_events (connection_id, created_at DESC);

  CREATE UNIQUE INDEX IF NOT EXISTS gmail_sync_events_pubsub_unique
    ON gmail_sync_events (pubsub_message_id)
    WHERE pubsub_message_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS connected_services (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name text NOT NULL,
    first_detected_at timestamptz NOT NULL DEFAULT now(),
    last_detected_at timestamptz NOT NULL DEFAULT now(),
    notification_count integer NOT NULL DEFAULT 0,
    CONSTRAINT connected_services_user_service_unique UNIQUE (user_id, service_name)
  );
`;

let schemaReady: Promise<void> | null = null;

export async function ensureMailSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await ensureUserSchema();
      await getPool().query(CREATE_SCHEMA);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
