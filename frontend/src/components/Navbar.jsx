import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar({ title = "Dashboard" }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="dashboard-topbar">
      <div className="navbar-brand">
        <span className="navbar-title">{title}</span>
        <span className="navbar-user">Signed in as {user?.username || "admin"}</span>
      </div>
      <nav className="navbar-actions" aria-label="Dashboard navigation">
        <Link className="nav-link" to="/dashboard">
          Dashboard
        </Link>
        <Link className="nav-link" to="/employees">
          Employees
        </Link>
        <Link className="nav-link" to="/employee-leave">
          Employee Leave
        </Link>
        <Link className="nav-link" to="/archived-employees">
          Archived Employees
        </Link>
        <Link className="nav-link" to="/change-password">
          Change Password
        </Link>
        <button className="nav-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
