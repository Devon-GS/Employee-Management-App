import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";
import { createEmployee, fetchEmployees } from "../api";

export default function EmployeesPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [passportId, setPassportId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadEmployees() {
      try {
        const data = await fetchEmployees(token);
        if (mounted) {
          setEmployees(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load employees");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, [token]);

  function openModal() {
    setName("");
    setPassportId("");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (!submitting) {
      setShowModal(false);
      setError("");
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const newEmployee = await createEmployee(token, name, passportId);
      setEmployees((current) => [...current, newEmployee].sort((a, b) => a.name.localeCompare(b.name)));
      setShowModal(false);
      setName("");
      setPassportId("");
    } catch (err) {
      setError(err.message || "Unable to create employee");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <Navbar title="Employees" />
      <section className="content-panel employees-panel">
        <div className="employees-toolbar">
          <div className="panel-copy">
            <p className="eyebrow">Employee Directory</p>
            <h1>Employees</h1>
            <p className="subtitle">Add and review employee records in alphabetical order.</p>
          </div>
          <button className="primary-button" type="button" onClick={openModal}>
            Add Employee
          </button>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="table-state">Loading employees...</div>
          ) : employees.length === 0 ? (
            <div className="table-state">No employees added yet.</div>
          ) : (
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee name</th>
                  <th>Passport/ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.passport_id}</td>
                    <td>
                      <div className="table-actions">
                        <button className="secondary-button" type="button">
                          Startup
                        </button>
                        <button className="secondary-button" type="button">
                          Edit
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

      {showModal ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Employee</h2>
              <button className="icon-button" type="button" onClick={closeModal}>
                ×
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSave}>
              <label>
                Employee name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                />
              </label>
              <label>
                Passport/ID
                <input
                  value={passportId}
                  onChange={(event) => setPassportId(event.target.value)}
                />
              </label>
              {error ? <div className="error-banner">{error}</div> : null}
              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
