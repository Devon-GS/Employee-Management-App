import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";
import { changePasswordRequest } from "../api";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { token, user, updateUser } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!username.trim()) {
      setError("Username cannot be blank.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const updatedUser = await changePasswordRequest(
        token,
        username.trim(),
        currentPassword,
        newPassword,
      );
      updateUser({ ...user, username: updatedUser.username });
      setMessage("Account updated successfully.");
      setUsername(updatedUser.username);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.message || "Unable to update password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <Navbar title="Change Password" />
      <section className="content-panel">
        <div className="panel-copy">
          <p className="eyebrow">Account Settings</p>
          <h1>Update your account</h1>
          <p className="subtitle">Change your username, password, or both.</p>
        </div>

        <form className="password-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              maxLength={50}
              required
            />
          </label>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label>
            New password (leave blank to keep current password)
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={1}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error ? <div className="error-banner">{error}</div> : null}
          {message ? <div className="success-banner">{message}</div> : null}
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
