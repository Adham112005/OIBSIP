const form = document.getElementById("login-form");
const submitBtn = document.getElementById("submit-btn");

if (new URLSearchParams(location.search).get("registered") === "1") {
  showMessage("Account created. You can log in now.", "success");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    showMessage("Please fill in both fields.", "error");
    return;
  }

  submitBtn.disabled = true;
  try {
    const { ok, data } = await postJson("/api/login", { email, password });
    if (ok) {
      location.assign("/dashboard");
      return;
    }
    showMessage(data.error || "Login failed.", "error");
  } catch {
    showMessage(NETWORK_ERROR, "error");
  } finally {
    submitBtn.disabled = false;
  }
});