import { useEffect, useState } from "react";
import { fetchEmployees } from "../api";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";

function isPermitNearingExpiry(dateValue) {
  if (!dateValue) {
    return false;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    return false;
  }

  const permitDate = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayDate = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntilExpiry = (permitDate - todayDate) / (1000 * 60 * 60 * 24);

  return daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
}

function getDashboardRow(employee) {
  const startupData = employee.startup_data || {};
  const incompleteItems = Object.entries(startupData)
    .filter(([, item]) => item && !item.done && !item.na)
    .map(([label]) => label);
  const contractStatus = startupData["Contract Status"] || {};
  const permitStatus = startupData["Permit Status"] || {};
  const permitNearingExpiry = isPermitNearingExpiry(permitStatus.date);

  return {
    ...employee,
    incompleteItems,
    temporaryContract: contractStatus.status === "Temporary",
    permitNearingExpiry,
  };
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEmployees() {
      try {
        const data = await fetchEmployees(token);
        if (mounted) {
          setEmployees(data.map(getDashboardRow));
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load dashboard data");
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

  const dashboardEmployees = employees.filter(
    (employee) =>
      employee.incompleteItems.length > 0 || employee.temporaryContract || employee.permitNearingExpiry,
  );

  return (
    <main className="dashboard-shell">
      <Navbar title="Dashboard" />
      <section className="content-panel dashboard-panel">
        <div className="panel-copy">
          <p className="eyebrow">Employee Overview</p>
          <h1>Employee Status</h1>
          <p className="subtitle">Review incomplete startup items, contract status, and permit expiry dates.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="table-wrap">
          {loading ? (
            <div className="table-state">Loading employee status...</div>
          ) : dashboardEmployees.length === 0 ? (
            <div className="table-state">No employee issues found.</div>
          ) : (
            <table className="employee-table dashboard-status-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Incomplete</th>
                  <th>Contract Status</th>
                  <th>Permit Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardEmployees.map((employee) => (
                  <tr key={employee.id} className={employee.permitNearingExpiry ? "dashboard-permit-nearing" : ""}>
                    <td>{employee.name}</td>
                    <td>
                      {employee.incompleteItems.length ? (
                        <ul className="dashboard-incomplete-list">
                          {employee.incompleteItems.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{employee.temporaryContract ? "On Temporary Contract" : "-"}</td>
                    <td>{employee.permitNearingExpiry ? "Nearing Expire Date" : "-"}</td>
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
