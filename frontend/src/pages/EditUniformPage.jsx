import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchEmployee, fetchUniformIssue, saveUniformIssue } from "../api";
import { useAuth } from "../auth/AuthContext";

const UNIFORM_DESCRIPTION_OPTIONS = [
  "NAME TAG",
  "FUEL PUMP TAG",
  "SHIRT",
  "TROUSERS",
  "JACKET- LIGHT WEIGHT",
  "JACKET- PADDED(extra item)",
  "CAP",
  "BEANIE",
  "SAFTY SHOES",
];

const CONDITION_OPTIONS = ["NEW", "GOOD", "MEDIUM", "FAIR"];
const MAX_ROWS = 10;

function createEmptyUniformRow() {
  return {
    description: "",
    size: "",
    quantity: "",
    condition: "",
    details: "",
    returns: "",
    cost: "",
  };
}

function buildUniformRowsFromData(data) {
  if (!data?.rows || !Array.isArray(data.rows)) {
    return [];
  }

  return data.rows.slice(0, MAX_ROWS).map((row) => ({
    ...createEmptyUniformRow(),
    ...row,
  }));
}

export default function EditUniformPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { token } = useAuth();
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
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
          setRows(savedUniformIssue ? buildUniformRowsFromData(savedUniformIssue) : []);
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

  function updateRow(index, field, value) {
    setRows((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addRow() {
    setRows((current) => (current.length >= MAX_ROWS ? current : [...current, createEmptyUniformRow()]));
  }

  function removeRow(index) {
    setRows((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      await saveUniformIssue(token, employeeId, rows);
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
              {rows.map((row, index) => {
                return (
                  <tr key={`${row.description || "row"}-${index}`}>
                    <td>
                      <select
                        value={row.description}
                        onChange={(event) => updateRow(index, "description", event.target.value)}
                      >
                        <option value="">Select</option>
                        {UNIFORM_DESCRIPTION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <button
                        className="row-remove-button"
                        type="button"
                        onClick={() => removeRow(index)}
                      >
                        Remove Row
                      </button>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.size}
                        onChange={(event) => updateRow(index, "size", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={row.quantity}
                        onChange={(event) => updateRow(index, "quantity", event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={row.condition}
                        onChange={(event) => updateRow(index, "condition", event.target.value)}
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
                        onChange={(event) => updateRow(index, "details", event.target.value)}
                      />
                    </td>
                    <td>
                      <textarea
                        rows="3"
                        value={row.returns}
                        onChange={(event) => updateRow(index, "returns", event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={row.cost}
                        onChange={(event) => updateRow(index, "cost", event.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="startup-actions">
          <button className="secondary-button" type="button" onClick={addRow} disabled={rows.length >= MAX_ROWS}>
            Add Row
          </button>
          <button className="primary-button" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </main>
  );
}
