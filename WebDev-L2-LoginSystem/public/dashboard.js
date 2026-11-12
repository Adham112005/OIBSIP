const logoutBtn = document.getElementById("logout-btn");

async function loadUser() {
  try {
    const res = await fetch("/api/me", { credentials: "same-origin" });
    if (res.status === 401) {
      location.replace("/login");
      return;
    }
    const user = await res.json();
    document.getElementById("user-email").textContent = user.email;
    document.getElementById("user-since").textContent = new Date(
      user.createdAt.replace(" ", "T") + "Z"
    ).toLocaleDateString();
  } catch {
    showMessage(NETWORK_ERROR, "error");
  }
}

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  try {
    const { ok, status, data } = await postJson("/api/logout");
    if (ok || status === 401) {
      location.replace("/login");
      return;
    }
    showMessage(data.error || "Could not log out.", "error");
  } catch {
    showMessage(NETWORK_ERROR, "error");
  } finally {
    logoutBtn.disabled = false;
  }
});

// If the page is restored from the back/forward cache after logout, re-check the session.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) loadUser();
});

loadUser();