-- Internship board schema (SQLite)
CREATE TABLE IF NOT EXISTS internships (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT    NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  company        TEXT    NOT NULL CHECK (length(company) BETWEEN 2 AND 80),
  location       TEXT    NOT NULL CHECK (length(location) BETWEEN 2 AND 80),
  mode           TEXT    NOT NULL CHECK (mode IN ('remote', 'onsite', 'hybrid')),
  stipend        INTEGER NOT NULL DEFAULT 0 CHECK (stipend >= 0),
  duration_weeks INTEGER NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  skills         TEXT    NOT NULL DEFAULT '[]',          -- JSON array of strings
  deadline       TEXT    NOT NULL,                       -- ISO date YYYY-MM-DD
  status         TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_internships_status   ON internships (status);
CREATE INDEX IF NOT EXISTS idx_internships_mode     ON internships (mode);
CREATE INDEX IF NOT EXISTS idx_internships_deadline ON internships (deadline);
