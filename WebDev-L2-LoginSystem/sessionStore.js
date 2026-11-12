// Small SQLite-backed session store so sessions survive server restarts
// (express-session's default MemoryStore is not meant for real use).
const session = require("express-session");

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

class SQLiteStore extends session.Store {
  constructor(db) {
    super();
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid     TEXT PRIMARY KEY,
        sess    TEXT NOT NULL,
        expires INTEGER NOT NULL
      );
    `);
    this._get = db.prepare("SELECT sess, expires FROM sessions WHERE sid = ?");
    this._set = db.prepare(
      "INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?) " +
      "ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires"
    );
    this._touch = db.prepare("UPDATE sessions SET expires = ? WHERE sid = ?");
    this._del = db.prepare("DELETE FROM sessions WHERE sid = ?");
    this._clean = db.prepare("DELETE FROM sessions WHERE expires <= ?");

    this._clean.run(Date.now());
    this._timer = setInterval(() => this._clean.run(Date.now()), 15 * 60 * 1000);
    this._timer.unref();
  }

  _expiry(sess) {
    const exp = sess && sess.cookie && sess.cookie.expires;
    const ms = exp ? new Date(exp).getTime() : NaN;
    return Number.isFinite(ms) ? ms : Date.now() + DEFAULT_TTL_MS;
  }

  get(sid, cb) {
    try {
      const row = this._get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires <= Date.now()) {
        this._del.run(sid);
        return cb(null, null);
      }
      cb(null, JSON.parse(row.sess));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this._set.run(sid, JSON.stringify(sess), this._expiry(sess));
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this._touch.run(this._expiry(sess), sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this._del.run(sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }
}

module.exports = SQLiteStore;