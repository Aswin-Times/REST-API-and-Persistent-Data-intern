-- Ready-to-import sample database (SQLite). Usage: sqlite3 internships.db < db/sample-data.sql
-- Generated from db/schema.sql + db/seed.json

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

DELETE FROM internships;

INSERT INTO internships (title, company, location, mode, stipend, duration_weeks, skills, deadline, status) VALUES
  ('Frontend Developer Intern', 'Brightleaf Labs', 'Bengaluru', 'hybrid', 15000, 12, '["HTML","CSS","JavaScript","React"]', '2026-12-15', 'open'),
  ('Backend Engineering Intern', 'Northwind Cloud', 'Remote', 'remote', 20000, 16, '["Node.js","Express","SQL"]', '2026-12-20', 'open'),
  ('Data Analyst Intern', 'Quanta Metrics', 'Pune', 'onsite', 12000, 8, '["Python","SQL","Excel"]', '2026-12-05', 'open'),
  ('UI/UX Design Intern', 'Pixel & Pine', 'Chennai', 'hybrid', 10000, 10, '["Figma","User Research"]', '2026-11-30', 'closed'),
  ('Machine Learning Intern', 'Synapse AI', 'Hyderabad', 'onsite', 25000, 24, '["Python","PyTorch","Statistics"]', '2027-01-10', 'open'),
  ('DevOps Intern', 'Northwind Cloud', 'Remote', 'remote', 18000, 12, '["Docker","Linux","CI/CD"]', '2027-01-05', 'open'),
  ('Mobile App Intern', 'Kite Mobile', 'Kochi', 'hybrid', 14000, 12, '["Flutter","Dart"]', '2026-12-28', 'open'),
  ('Content Marketing Intern', 'Brightleaf Labs', 'Remote', 'remote', 8000, 6, '["Writing","SEO"]', '2026-12-01', 'closed'),
  ('QA Automation Intern', 'Testwise', 'Noida', 'onsite', 11000, 10, '["Selenium","JavaScript"]', '2026-12-18', 'open'),
  ('Cybersecurity Intern', 'Shieldline', 'Mumbai', 'hybrid', 22000, 20, '["Networking","Linux","OWASP"]', '2027-01-15', 'open'),
  ('Product Management Intern', 'Quanta Metrics', 'Bengaluru', 'onsite', 16000, 12, '["Communication","Analytics"]', '2026-12-22', 'open'),
  ('Full Stack Intern', 'Kite Mobile', 'Remote', 'remote', 19000, 16, '["React","Node.js","PostgreSQL"]', '2027-01-02', 'open');
