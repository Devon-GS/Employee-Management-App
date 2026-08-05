import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";
import { changePasswordRequest } from "../api";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
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

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await changePasswordRequest(token, currentPassword, newPassword);
      setMessage("Password updated successfully.");
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
          <p className="eyebrow">Admin Account</p>
          <h1>Update your password</h1>
          <p className="subtitle">This changes the password for the single admin user.</p>
        </div>

        <form className="password-form" onSubmit={handleSubmit}>
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
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
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
              {submitting ? "Saving..." : "Save password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
