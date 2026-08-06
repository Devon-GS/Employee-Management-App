import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchEmployee, fetchUniformIssue, saveUniformIssue } from "../api";
import { useAuth } from "../auth/AuthContext";

const UNIFORM_ROWS = [
  "NAME TAG",
  "FUEL PUMP TAG",
  "SHIRT",
  "TROUSERS",
  "JACKET- LIGHT WEIGHT",
  "JACKET- PADDED (extra item)",
  "CAP",
  "BEANIE",
  "SAFTY SHOES",
];

const CONDITION_OPTIONS = ["NEW", "GOOD", "MEDIUM", "FAIR"];

function buildUniformRows() {
  return UNIFORM_ROWS.reduce((accumulator, label) => {
    accumulator[label] = {
      size: "",
      quantity: "",
      condition: "",
      details: "",
      returns: "",
      cost: "",
    };
    return accumulator;
  }, {});
}

function buildUniformRowsFromData(data) {
  const rows = buildUniformRows();
  const sourceRows = data?.rows || {};

  for (const label of UNIFORM_ROWS) {
    rows[label] = {
      ...rows[label],
      ...(sourceRows[label] || {}),
    };
  }

  return rows;
}

export default function EditUniformPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { token } = useAuth();
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState(buildUniformRows);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadEmployee() {
      try {
        const [employee, savedUniformIssue] = await Promise.all([
          fetchEmployee(token, employeeId),
          fetchUniformIssue(token, employeeId),
        ]);
        if (mounted) {
          setEmployeeName(savedUniformIssue?.employee_name || employee.name);
          if (savedUniformIssue) {
            setRows(buildUniformRowsFromData(savedUniformIssue));
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load employee");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEmployee();

    return () => {
      mounted = false;
    };
  }, [employeeId, token]);

  function updateRow(label, field, value) {
    setRows((current) => ({
      ...current,
      [label]: {
        ...current[label],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await saveUniformIssue(token, employeeId, rows);
      setMessage("Uniform issue saved successfully.");
      navigate(`/employees/${employeeId}/startup`, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to save uniform issue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="content-panel uniform-panel">
        <div className="panel-copy">
          <p className="eyebrow">Uniform</p>
          <h1>Edit Uniform</h1>
          <div className="uniform-name-line">
            <span>Name</span>
            <strong>{loading ? "Loading..." : employeeName}</strong>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        <div className="table-wrap">
          <table className="uniform-edit-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th>SIZE</th>
                <th>QUANTITY</th>
                <th>CONDITION</th>
                <th>DETAILS</th>
                <th>RETURNS</th>
                <th>COST</th>
              </tr>
            </thead>
            <tbody>
              {UNIFORM_ROWS.map((label) => {
                const row = rows[label];

                return (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>
                      <input
                        type="text"
                        value={row.size}
                        onChange={(event) => updateRow(label, "size", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={row.quantity}
                        onChange={(event) => updateRow(label, "quantity", event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={row.condition}
                        onChange={(event) => updateRow(label, "condition", event.target.value)}
                      >
                        <option value="">Select</option>
                        {CONDITION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        rows="3"
                        value={row.details}
                        onChange={(event) => updateRow(label, "details", event.target.value)}
                      />
                    </td>
                    <td>
                      <textarea
                        rows="3"
                        value={row.returns}
                        onChange={(event) => updateRow(label, "returns", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.cost}
                        onChange={(event) => updateRow(label, "cost", event.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="startup-actions">
          <button className="primary-button" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </main>
  );
}
