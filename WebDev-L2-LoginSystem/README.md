# Login Authentication System (Web Development – Level 2, Task 4)

A full-stack authentication system built with **Node.js, Express and SQLite**: registration, login, a protected dashboard and logout.

## Features
- Registration with email + password
  - Password rules: at least 8 characters, at least 1 number (max 72 bytes, a bcrypt limit)
  - Duplicate email check with a clear error
- Login with a generic error ("Invalid email or password.") that never reveals which field was wrong
- Protected `/dashboard`: visiting it without a session redirects to `/login`
- Logout button that destroys the session on the server and clears the cookie
- Passwords are **hashed with bcrypt** (cost 12), never stored as plain text
- Form validation on both pages (no empty submissions), plus server-side validation

## Security measures
| Threat | Protection |
|--------|-----------|
| Plain-text passwords | bcrypt hashing (`bcryptjs`, cost 12) |
| SQL injection | Prepared statements only (built-in `node:sqlite`) |
| Brute-force / credential stuffing | `express-rate-limit` (10 failed logins per 15 min per IP, 10 registrations per hour) |
| User enumeration on login | Same error and same timing (dummy hash comparison) for unknown email and wrong password |
| Session fixation | Session ID regenerated on login |
| Session theft via XSS | Cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production |
| CSRF | Per-session CSRF token required (header `X-CSRF-Token`) on every POST, compared in constant time |
| XSS | Strict Content-Security-Policy (`helmet`), no inline scripts, user data inserted with `textContent` |
| Cached private pages | `Cache-Control: no-store` on pages, so Back after logout doesn't show the dashboard |
| Oversized / malformed input | 10 KB JSON limit, type checks, generic error handler (no stack traces to the client) |
| Lost sessions on restart | Sessions stored in SQLite, expire after 2 hours |

## Run locally
Requires **Node.js 22.13 or newer** (uses the built-in `node:sqlite`, so there is nothing to compile).
You may see an "ExperimentalWarning: SQLite" message in the terminal. It is harmless.

```bash
npm install
npm start
```

Open http://localhost:3000. The database and session secret are created automatically in `data/` (git-ignored).

## Project structure
```
server.js          Express app, routes, security middleware
db.js              SQLite connection and users table
sessionStore.js    SQLite-backed session store
views/             login.html, register.html, dashboard.html
public/            style.css and client-side scripts
data/              Created at runtime (database + session secret), not committed
```

## Environment variables (optional)
| Variable | Purpose |
|----------|---------|
| `PORT` | Port (default 3000) |
| `HOST` | Bind address (default `127.0.0.1`, local only) |
| `SESSION_SECRET` | Session signing secret (otherwise generated once into `data/.session-secret`) |
| `NODE_ENV=production` | Enables `Secure` cookies and HTTPS upgrades (needs HTTPS) |
| `TRUST_PROXY=1` | Set when running behind a reverse proxy |

## Notes
- The duplicate-email error on registration reveals that an email is registered. This is required by the task and is a normal trade-off.
- For real deployment, serve over HTTPS and add email verification and password reset.

## Demo checklist
1. Register with a weak password (error), then with a valid one
2. Register the same email again (duplicate error)
3. Log in with a wrong password (generic error)
4. Log in correctly and open the dashboard
5. Open `/dashboard` in a new private window (redirects to login)
6. Logout, then press Back (still redirected to login)