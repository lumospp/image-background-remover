-- Per-IP (hashed) daily quota and site-wide monthly upstream-attempt budget.
-- No raw images, emails, or raw IP addresses are stored.
-- Run once: wrangler d1 execute bg-remover-db --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS usage_counters (
    scope TEXT NOT NULL CHECK (scope IN ('ip', 'global')),
    token TEXT NOT NULL,
    period TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
    PRIMARY KEY (scope, token, period)
);

-- Legacy users table intentionally not required by the anonymous production app.
-- Existing deployments with a users table are not modified or dropped.
