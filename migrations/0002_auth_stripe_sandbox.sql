-- 2026-11-07: Google auth + Stripe TEST MODE practice only.
-- Safe, additive; does not delete or rewrite the existing usage_counters table.
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS sandbox_checkout_orders (
  stripe_session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id),
  stripe_price_id TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK(credits > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sandbox_orders_user ON sandbox_checkout_orders(user_id);

CREATE TABLE IF NOT EXISTS sandbox_credit_ledger (
  entry_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES auth_users(id),
  delta INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('test_checkout','test_refund')),
  source_ref TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sandbox_credits_user ON sandbox_credit_ledger(user_id);

CREATE TABLE IF NOT EXISTS sandbox_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
