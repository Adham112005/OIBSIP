const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

const { db, dataDir } = require("./db");
const SQLiteStore = require("./sessionStore");

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const BCRYPT_COST = 12;
const SESSION_COOKIE = "oibsip.sid";
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/* ---------- Session secret (env var, or generated once and kept in data/) ---------- */

function getSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(dataDir, ".session-secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

/* ---------- Validation ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

function passwordError(password) {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  // bcrypt only uses the first 72 bytes; reject longer input instead of silently truncating
  if (Buffer.byteLength(password, "utf8") > 72) return "Password must be at most 72 bytes.";
  return null;
}

/* ---------- Prepared statements ---------- */

const insertUser = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
const findByEmail = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?");
const findById = db.prepare("SELECT id, email, created_at FROM users WHERE id = ?");

// Compared against when the email doesn't exist, so response time doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", BCRYPT_COST);

/* ---------- App setup ---------- */

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Only force HTTPS upgrades in production (breaks plain-http localhost in some browsers)
        "upgrade-insecure-requests": isProd ? [] : null,
      },
    },
  })
);

app.use(express.json({ limit: "10kb" }));

app.use(
  session({
    name: SESSION_COOKIE,
    secret: getSessionSecret(),
    store: new SQLiteStore(db),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
);

app.use("/assets", express.static(path.join(__dirname, "public")));

/* ---------- Middleware ---------- */

function noStore(req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}

// Pages: redirect to /login. API: respond 401.
function requireUser({ redirect }) {
  return (req, res, next) => {
    const deny = () =>
      redirect ? res.redirect("/login") : res.status(401).json({ error: "Not authenticated." });

    if (!req.session.userId) return deny();
    const user = findById.get(req.session.userId);
    if (!user) return req.session.destroy(() => deny());
    req.user = user;
    next();
  };
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session.userId && findById.get(req.session.userId)) return res.redirect("/dashboard");
  next();
}

function csrfProtect(req, res, next) {
  const sent = Buffer.from(req.get("x-csrf-token") || "");
  const expected = Buffer.from(req.session.csrfToken || "");
  if (expected.length === 0 || sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return res.status(403).json({ error: "Invalid request. Please refresh the page and try again." });
  }
  next();
}

const limiterMessage = { error: "Too many attempts. Please try again later." };

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiterMessage,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiterMessage,
});

/* ---------- Pages ---------- */

const viewFile = (name) => path.join(__dirname, "views", name);

// Fail fast with a clear message if project files were not copied correctly
const REQUIRED_FILES = [
  "views/login.html", "views/register.html", "views/dashboard.html",
  "public/style.css", "public/common.js", "public/login.js", "public/register.js", "public/dashboard.js",
];
const missing = REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(__dirname, f)));
if (missing.length > 0) {
  console.error("\nMissing project files:\n  - " + missing.join("\n  - "));
  console.error("\nCopy them into the folders above (next to server.js), then run npm start again.\n");
  process.exit(1);
}

app.get("/", (req, res) => res.redirect(req.session.userId ? "/dashboard" : "/login"));
app.get("/login", noStore, redirectIfLoggedIn, (req, res) => res.sendFile(viewFile("login.html")));
app.get("/register", noStore, redirectIfLoggedIn, (req, res) => res.sendFile(viewFile("register.html")));
app.get("/dashboard", noStore, requireUser({ redirect: true }), (req, res) =>
  res.sendFile(viewFile("dashboard.html"))
);

/* ---------- API ---------- */

app.get("/api/csrf", noStore, (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  res.json({ csrfToken: req.session.csrfToken });
});

app.post("/api/register", registerLimiter, csrfProtect, async (req, res) => {
  const body = req.body || {};
  const email = validateEmail(body.email);
  if (!email) return res.status(400).json({ error: "Please enter a valid email address." });

  const pwError = passwordError(body.password);
  if (pwError) return res.status(400).json({ error: pwError });

  const hash = await bcrypt.hash(body.password, BCRYPT_COST);

  try {
    insertUser.run(email, hash);
  } catch (err) {
    // The UNIQUE constraint is the source of truth (also safe against race conditions)
    if (err.errcode === 2067 || /UNIQUE constraint failed/.test(err.message)) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    throw err;
  }
  res.status(201).json({ message: "Account created. You can log in now." });
});

app.post("/api/login", loginLimiter, csrfProtect, async (req, res) => {
  const body = req.body || {};
  const email = validateEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  const user = email ? findByEmail.get(email) : undefined;
  const matches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  // Same message for unknown email and wrong password
  if (!user || !matches) return res.status(401).json({ error: "Invalid email or password." });

  // New session ID on login prevents session fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Something went wrong. Please try again." });
    req.session.userId = user.id;
    req.session.save((saveErr) => {
      if (saveErr) return res.status(500).json({ error: "Something went wrong. Please try again." });
      res.json({ message: "Logged in." });
    });
  });
});

app.post("/api/logout", requireUser({ redirect: false }), csrfProtect, (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: isProd });
    if (err) return res.status(500).json({ error: "Could not log out. Please try again." });
    res.json({ message: "Logged out." });
  });
});

app.get("/api/me", noStore, requireUser({ redirect: false }), (req, res) => {
  res.json({ email: req.user.email, createdAt: req.user.created_at });
});

/* ---------- Errors ---------- */

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  res.status(404).type("text").send("Page not found.");
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid request body." });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request too large." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST === "127.0.0.1" ? "localhost" : HOST}:${PORT}`);
});