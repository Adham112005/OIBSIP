// SQLite setup using Node's built-in node:sqlite (no native packages to compile).
// All queries elsewhere use prepared statements with bound parameters.
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "app.db"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = { db, dataDir };