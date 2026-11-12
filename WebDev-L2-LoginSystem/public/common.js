// Shared helpers: CSRF-protected JSON POST and message display.

async function getCsrfToken() {
  const res = await fetch("/api/csrf", { credentials: "same-origin" });
  if (!res.ok) throw new Error("csrf");
  return (await res.json()).csrfToken;
}

async function postJson(url, body) {
  const token = await getCsrfToken();
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON response */ }
  return { ok: res.ok, status: res.status, data };
}

function showMessage(text, type) {
  const el = document.getElementById("message");
  el.textContent = text;               // textContent: never inject HTML
  el.className = "message show " + type;
}

function clearMessage() {
  const el = document.getElementById("message");
  el.textContent = "";
  el.className = "message";
}

const NETWORK_ERROR = "Could not reach the server. Please try again.";