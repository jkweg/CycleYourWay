const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "cycleyourway.db");
const sqlite = new DatabaseSync(dbPath);

class StatementWrapper {
  constructor(database, statement) {
    this.database = database;
    this.statement = statement;
  }

  get(...params) {
    return this.statement.get(...params);
  }

  all(...params) {
    return this.statement.all(...params);
  }

  run(...params) {
    const result = this.statement.run(...params);
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: Number(result.changes),
    };
  }
}

const db = {
  exec(sql) {
    sqlite.exec(sql);
  },
  prepare(sql) {
    return new StatementWrapper(sqlite, sqlite.prepare(sql));
  },
};

sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS saved_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    mode TEXT NOT NULL,
    geojson TEXT NOT NULL,
    distance_km REAL,
    duration_seconds INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;
