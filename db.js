const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'itinerate.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');   // better concurrent read performance
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  // ── Users table ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name    TEXT    NOT NULL,
      last_name     TEXT    NOT NULL DEFAULT '',
      email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Quiz results table ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_results (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      personality_type TEXT    NOT NULL,
      answers_json     TEXT    NOT NULL,   -- JSON array of {type, index}
      taken_at         TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Saved itineraries table ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS itineraries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      destination_id   TEXT    NOT NULL,
      destination_name TEXT    NOT NULL,
      personality_type TEXT    NOT NULL,
      itinerary_json   TEXT    NOT NULL,   -- day-by-day itinerary
      flight_json      TEXT,               -- selected flight object
      hotel_json       TEXT,               -- selected hotel object
      saved_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      -- one saved itinerary per user per destination
      UNIQUE (user_id, destination_id)
    );
  `);

  // Migrations for columns added after initial release
  try { db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN flight_json TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN hotel_json TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN destination_json TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN available_flights_json TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN available_return_flights_json TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN available_hotels_json TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN departure_date TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN return_date TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE itineraries ADD COLUMN return_flight_json TEXT`); } catch (_) {}

  console.log('✅ Database initialised at', DB_PATH);
  return db;
}

module.exports = { getDB, initDB };
