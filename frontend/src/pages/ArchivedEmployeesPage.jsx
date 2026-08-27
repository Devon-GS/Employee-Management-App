import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchArchivedEmployees, restoreEmployee } from "../api";
import Navbar from "../components/Navbar";

export default function ArchivedEmployeesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadArchivedEmployees() {
      setPageError("");
      setLoading(true);

      try {
        const data = await fetchArchivedEmployees(token);
        if (mounted) {
          setEmployees(data);
        }
      } catch (err) {
        if (mounted) {
          setPageError(err.message || "Unable to load archived employees");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadArchivedEmployees();

    return () => {
      mounted = false;
    };
  }, [token]);

  async function handleRestoreEmployee(employee) {
    const confirmed = window.confirm(`Restore ${employee.name} back to the active employee lists?`);
    if (!confirmed) {
      return;
    }

    try {
      await restoreEmployee(token, employee.id);
      setEmployees((current) => current.filter((currentEmployee) => currentEmployee.id !== employee.id));
    } catch (err) {
      setPageError(err.message || "Unable to restore employee");
    }
  }

  return (
    <main className="dashboard-shell">
      <Navbar title="Archived Employees" />
      <section className="content-panel employees-panel">
        <div className="employees-toolbar">
          <div className="panel-copy">
            <p className="eyebrow">Archived Records</p>
            <h1>Archived Employees</h1>
            <p className="subtitle">
              Review employees that were archived from the active directory and restore them when needed.
            </p>
          </div>
        </div>

        {pageError ? <div className="error-banner">{pageError}</div> : null}

        <div className="table-wrap">
          {loading ? (
            <div className="table-state">Loading archived employees...</div>
          ) : employees.length === 0 ? (
            <div className="table-state">No archived employees yet.</div>
          ) : (
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee name</th>
                  <th>Department</th>
                  <th>Passport/ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.department || "-"}</td>
                    <td>{employee.passport_id}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => navigate(`/employees/${employee.id}/profile`)}
                        >
                          View
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => handleRestoreEmployee(employee)}
                        >
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
