const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');
const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'internships.db');

/**
 * Open (or create) a SQLite database and apply the schema.
 * Pass ':memory:' for an in-memory database (used by tests).
 */
function openDatabase(file = process.env.DB_FILE || DEFAULT_FILE) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

module.exports = { openDatabase };
