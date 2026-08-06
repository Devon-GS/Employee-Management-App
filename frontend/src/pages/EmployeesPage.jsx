import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createEmployee, fetchEmployees, updateEmployee } from "../api";
import Navbar from "../components/Navbar";

const DEPARTMENT_OPTIONS = ["Forecourt", "Cashier", "Baker", "Car Wash"];

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [passportId, setPassportId] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadEmployees() {
      setPageError("");
      try {
        const data = await fetchEmployees(token);
        if (mounted) {
          setEmployees(data);
        }
      } catch (err) {
        if (mounted) {
          setPageError(err.message || "Unable to load employees");
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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && showModal) {
        closeModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal, submitting]);

  function resetForm(employee = null) {
    setEditingEmployeeId(employee?.id ?? null);
    setName(employee?.name ?? "");
    setDepartment(employee?.department ?? "");
    setPassportId(employee?.passport_id ?? "");
    setFormError("");
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(employee) {
    resetForm(employee);
    setShowModal(true);
  }

  function closeModal() {
    if (!submitting) {
      setShowModal(false);
      setFormError("");
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    if (!department) {
      setFormError("Please select a department.");
      setSubmitting(false);
      return;
    }

    try {
      const savedEmployee = editingEmployeeId
        ? await updateEmployee(token, editingEmployeeId, name, department, passportId)
        : await createEmployee(token, name, department, passportId);

      setEmployees((current) => {
        const nextEmployees = editingEmployeeId
          ? current.map((employee) => (employee.id === savedEmployee.id ? savedEmployee : employee))
          : [...current, savedEmployee];

        return nextEmployees.sort((a, b) => a.name.localeCompare(b.name));
      });
      setShowModal(false);
      resetForm();
    } catch (err) {
      setFormError(err.message || (editingEmployeeId ? "Unable to update employee" : "Unable to create employee"));
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
          <button className="primary-button" type="button" onClick={openCreateModal}>
            Add Employee
          </button>
        </div>

        {pageError ? <div className="error-banner">{pageError}</div> : null}

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
                          onClick={() => navigate(`/employees/${employee.id}/startup`)}
                        >
                          Startup
                        </button>
                        <button className="secondary-button" type="button">
                          Bank Acc
                        </button>
                        <button className="secondary-button" type="button">
                          Written Warning
                        </button>
                        <button className="secondary-button" type="button">
                          General
                        </button>
                        <button className="secondary-button" type="button">
                          Delete
                        </button>
                        <button className="secondary-button edit-button" type="button" onClick={() => openEditModal(employee)}>
                          <svg
                            className="action-icon"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75L4 17.25Zm14.71-8.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.94 1.94 3.92 3.92 1.94-1.94Z" />
                          </svg>
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
              <h2>{editingEmployeeId ? "Edit Employee" : "Add Employee"}</h2>
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
                Department
                <select value={department} onChange={(event) => setDepartment(event.target.value)} required>
                  <option value="">Select department</option>
                  {DEPARTMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Passport/ID
                <input
                  value={passportId}
                  onChange={(event) => setPassportId(event.target.value)}
                />
              </label>
              {formError ? <div className="error-banner">{formError}</div> : null}
              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={submitting || !department}>
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
