const form = document.getElementById("register-form");
const submitBtn = document.getElementById("submit-btn");

function validate(email, password, confirm) {
  if (!email || !password || !confirm) return "Please fill in all fields.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  if (new TextEncoder().encode(password).length > 72) return "Password must be at most 72 bytes.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = form.email.value.trim();
  const password = form.password.value;
  const problem = validate(email, password, form.confirm.value);
  if (problem) {
    showMessage(problem, "error");
    return;
  }

  submitBtn.disabled = true;
  try {
    const { ok, data } = await postJson("/api/register", { email, password });
    if (ok) {
      location.assign("/login?registered=1");
      return;
    }
    showMessage(data.error || "Registration failed.", "error");
  } catch {
    showMessage(NETWORK_ERROR, "error");
  } finally {
    submitBtn.disabled = false;
  }
});