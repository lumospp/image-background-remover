-- D1 Database Schema for Image BG Remover
-- Run this with: wrangler d1 execute bg-remover-db --file=schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by google_id
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Index for usage queries
CREATE INDEX IF NOT EXISTS idx_users_usage ON users(usage_count);
