import { useEffect, useState } from "react";
import {
  createAnnualLeave,
  createSickLeave,
  deleteAnnualLeave,
  deleteSickLeave,
  fetchAnnualLeave,
  fetchEmployees,
  fetchEmployeeLeaveReport,
  fetchSickLeave,
  updateAnnualLeave,
  updateSickLeave,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";

const SECTION_LABELS = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  reports: "Reports",
};

const DEFAULT_FORM_STATE = {
  employeeId: "",
  startDate: "",
  endDate: "",
  reason: "",
  daysUsed: "",
  status: "Approved",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDays(value) {
  return Number.parseFloat(value || "0");
}

function formatDays(value) {
  const amount = Number.parseFloat(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function statusClass(status) {
  return (status || "").toLowerCase().replace(/\s+/g, "-");
}

export default function EmployeeLeavePage() {
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState("annual");
  const [employees, setEmployees] = useState([]);
  const [reportEmployees, setReportEmployees] = useState([]);
  const [annualLeave, setAnnualLeave] = useState([]);
  const [sickLeave, setSickLeave] = useState([]);
  const [selectedReportEmployeeId, setSelectedReportEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [recordType, setRecordType] = useState("annual");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [medicalCertFile, setMedicalCertFile] = useState(null);
  const [existingMedicalCert, setExistingMedicalCert] = useState("");
  const [removeMedicalCert, setRemoveMedicalCert] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [employeeData, annualData, sickData] = await Promise.all([
        fetchEmployees(token),
        fetchAnnualLeave(token),
        fetchSickLeave(token),
      ]);
      const reportData = await fetchEmployeeLeaveReport(token);
      setEmployees(employeeData);
      setAnnualLeave(annualData);
      setSickLeave(sickData);
      setReportEmployees(reportData.employees || []);
      setSelectedReportEmployeeId((current) => current || employeeData[0]?.id?.toString() || "");
    } catch (err) {
      setError(err.message || "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openRecordModal(type, record = null) {
    setRecordType(type);
    setEditingRecordId(record?.id ?? null);
    setModalOpen(true);
    setError("");
    setMessage("");
    setRemoveMedicalCert(false);
    setMedicalCertFile(null);

    if (record) {
      setFormState({
        employeeId: record.employee_id?.toString?.() || "",
        startDate: record.start_date || "",
        endDate: record.end_date || "",
        reason: record.reason || "",
        daysUsed: record.days_used?.toString?.() || "",
        status: record.status || "Approved",
      });
      setExistingMedicalCert(record.medical_cert || "");
      return;
    }

    setFormState({
      ...DEFAULT_FORM_STATE,
      employeeId: employees[0]?.id?.toString?.() || "",
      startDate: todayIso(),
      endDate: todayIso(),
    });
    setExistingMedicalCert("");
  }

  function closeModal(force = false) {
    if (saving && !force) {
      return;
    }

    setModalOpen(false);
    setEditingRecordId(null);
    setFormState(DEFAULT_FORM_STATE);
    setMedicalCertFile(null);
    setExistingMedicalCert("");
    setRemoveMedicalCert(false);
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!formState.employeeId || !formState.startDate || !formState.endDate || !formState.daysUsed) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (recordType === "annual") {
        const payload = {
          employee_id: Number(formState.employeeId),
          start_date: formState.startDate,
          end_date: formState.endDate,
          reason: formState.reason,
          days_used: parseDays(formState.daysUsed),
          status: formState.status,
        };

        editingRecordId
          ? await updateAnnualLeave(token, editingRecordId, payload)
          : await createAnnualLeave(token, payload);
      } else {
        const formData = new FormData();
        formData.append("employee_id", formState.employeeId);
        formData.append("start_date", formState.startDate);
        formData.append("end_date", formState.endDate);
        formData.append("reason", formState.reason);
        formData.append("days_used", String(parseDays(formState.daysUsed)));
        formData.append("status", formState.status);

        if (medicalCertFile) {
          formData.append("medical_cert_file", medicalCertFile);
        } else if (editingRecordId) {
          formData.append("medical_cert", removeMedicalCert ? "" : existingMedicalCert || "");
        }

        editingRecordId
          ? await updateSickLeave(token, editingRecordId, formData)
          : await createSickLeave(token, formData);
      }

      setMessage(`${SECTION_LABELS[recordType]} saved successfully.`);
      closeModal(true);
      await loadData();
    } catch (err) {
      setError(err.message || `Unable to save ${recordType} leave`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type, recordId) {
    const confirmed = window.confirm(`Delete this ${type} leave record?`);
    if (!confirmed) {
      return;
    }

    try {
      if (type === "annual") {
        await deleteAnnualLeave(token, recordId);
      } else {
        await deleteSickLeave(token, recordId);
      }
      setMessage(`${SECTION_LABELS[type]} deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || `Unable to delete ${type} leave`);
    }
  }

  const reportEmployee =
    reportEmployees.find((employee) => employee.id === Number(selectedReportEmployeeId)) || null;
  const reportAnnualRecords = annualLeave.filter(
    (leave) => leave.employee_id === Number(selectedReportEmployeeId),
  );
  const reportSickRecords = sickLeave.filter((leave) => leave.employee_id === Number(selectedReportEmployeeId));
  const annualUsed = reportAnnualRecords.reduce((sum, leave) => sum + parseDays(leave.days_used), 0);
  const sickUsed = reportSickRecords.reduce((sum, leave) => sum + parseDays(leave.days_used), 0);

  return (
    <main className="dashboard-shell">
      <Navbar title="Employee Leave" />
      <section className="content-panel leave-panel">
        <div className="employees-toolbar">
          <div className="panel-copy">
            <p className="eyebrow">Leave Management</p>
            <h1>Employee Leave</h1>
            <p className="subtitle">Track annual leave, sick leave, and leave balances from one place.</p>
          </div>
        </div>

        <div className="leave-tabs" role="tablist" aria-label="Employee leave sections">
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`leave-tab ${activeSection === key ? "active" : ""}`}
              onClick={() => setActiveSection(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        {loading ? <div className="table-state">Loading leave data...</div> : null}

        {!loading && activeSection === "annual" ? (
          <div className="leave-section">
            <div className="leave-section-header">
              <div>
                <h2>Annual Leave</h2>
                <p>Manage annual leave entries for all employees.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => openRecordModal("annual")}>
                Add Annual Leave
              </button>
            </div>

            <div className="table-wrap">
              <table className="employee-table leave-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {annualLeave.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="table-state">
                        No annual leave records yet.
                      </td>
                    </tr>
                  ) : (
                    annualLeave.map((leave) => (
                      <tr key={leave.id}>
                        <td>{leave.employee_name}</td>
                        <td>
                          {leave.start_date} to {leave.end_date}
                        </td>
                        <td>{formatDays(leave.days_used)}</td>
                        <td>{leave.reason || "-"}</td>
                        <td>
                          <span className={`status-pill ${statusClass(leave.status)}`}>{leave.status}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="secondary-button" type="button" onClick={() => openRecordModal("annual", leave)}>
                              Edit
                            </button>
                            <button className="secondary-button" type="button" onClick={() => handleDelete("annual", leave.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeSection === "sick" ? (
          <div className="leave-section">
            <div className="leave-section-header">
              <div>
                <h2>Sick Leave</h2>
                <p>Manage sick leave entries and attached medical certificates.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => openRecordModal("sick")}>
                Add Sick Leave
              </button>
            </div>

            <div className="table-wrap">
              <table className="employee-table leave-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Days</th>
                    <th>Medical Cert</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sickLeave.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="table-state">
                        No sick leave records yet.
                      </td>
                    </tr>
                  ) : (
                    sickLeave.map((leave) => (
                      <tr key={leave.id}>
                        <td>{leave.employee_name}</td>
                        <td>
                          {leave.start_date} to {leave.end_date}
                        </td>
                        <td>{formatDays(leave.days_used)}</td>
                        <td>{leave.medical_cert || "-"}</td>
                        <td>
                          <span className={`status-pill ${statusClass(leave.status)}`}>{leave.status}</span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="secondary-button" type="button" onClick={() => openRecordModal("sick", leave)}>
                              Edit
                            </button>
                            <button className="secondary-button" type="button" onClick={() => handleDelete("sick", leave.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeSection === "reports" ? (
          <div className="leave-section">
            <div className="leave-section-header">
              <div>
                <h2>Reports</h2>
                <p>Review leave allocation, usage, and remaining balances by employee.</p>
              </div>
              <label className="report-picker">
                Select employee
                <select value={selectedReportEmployeeId} onChange={(event) => setSelectedReportEmployeeId(event.target.value)}>
                  <option value="">Choose an employee</option>
                  {reportEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!reportEmployee ? (
              <div className="table-state">Select an employee to view the report.</div>
            ) : (
              <div className="leave-report">
                <div className="leave-report-header">
                  <div>
                    <p className="eyebrow">Employee Report</p>
                    <h2>{reportEmployee.name}</h2>
                    <p className="subtitle">
                      Passport/ID {reportEmployee.passport_id} | Permanent contract start{" "}
                      {reportEmployee.permanent_contract_start_date || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="leave-report-cards">
                  <article className="leave-card">
                    <div className="card-header">
                      <div className="card-title">
                        <h3>Annual Leave</h3>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="leave-stats">
                        <div className="stat-item">
                          <span className="stat-label">Allocated</span>
                          <span className="stat-value">{formatDays(reportEmployee.annual_leave_entitlement)}</span>
                          <span className="stat-unit">days</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Used</span>
                          <span className="stat-value">{formatDays(annualUsed)}</span>
                          <span className="stat-unit">days</span>
                        </div>
                        <div className="stat-item highlight">
                          <span className="stat-label">Remaining</span>
                          <span className="stat-value">{formatDays(reportEmployee.annual_leave_balance)}</span>
                          <span className="stat-unit">days</span>
                        </div>
                      </div>
                      <div className="report-mini-table">
                        <div className="report-mini-header">
                          <span>Period</span>
                          <span>Days</span>
                          <span>Reason</span>
                        </div>
                        {reportAnnualRecords.length === 0 ? (
                          <div className="report-mini-row empty">No annual leave records</div>
                        ) : (
                          reportAnnualRecords.map((leave) => (
                            <div key={leave.id} className="report-mini-row">
                              <span>
                                {leave.start_date} to {leave.end_date}
                              </span>
                              <span>{formatDays(leave.days_used)}</span>
                              <span>{leave.reason || "-"}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </article>

                  <article className="leave-card">
                    <div className="card-header">
                      <div className="card-title">
                        <h3>Sick Leave</h3>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="leave-stats">
                        <div className="stat-item">
                          <span className="stat-label">Allocated</span>
                          <span className="stat-value">{formatDays(reportEmployee.sick_leave_entitlement)}</span>
                          <span className="stat-unit">days</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Used</span>
                          <span className="stat-value">{formatDays(sickUsed)}</span>
                          <span className="stat-unit">days</span>
                        </div>
                        <div className="stat-item highlight">
                          <span className="stat-label">Remaining</span>
                          <span className="stat-value">{formatDays(reportEmployee.sick_leave_balance)}</span>
                          <span className="stat-unit">days</span>
                        </div>
                      </div>
                      <div className="report-mini-table">
                        <div className="report-mini-header">
                          <span>Period</span>
                          <span>Days</span>
                          <span>Reason</span>
                        </div>
                        {reportSickRecords.length === 0 ? (
                          <div className="report-mini-row empty">No sick leave records</div>
                        ) : (
                          reportSickRecords.map((leave) => (
                            <div key={leave.id} className="report-mini-row">
                              <span>
                                {leave.start_date} to {leave.end_date}
                              </span>
                              <span>{formatDays(leave.days_used)}</span>
                              <span>{leave.reason || "-"}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>

      {modalOpen ? (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card leave-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRecordId ? `Edit ${SECTION_LABELS[recordType]}` : `Add ${SECTION_LABELS[recordType]}`}</h2>
              <button className="icon-button" type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="modal-form leave-form" onSubmit={handleSave}>
              <label>
                Employee
                <select
                  value={formState.employeeId}
                  onChange={(event) => setFormState((current) => ({ ...current, employeeId: event.target.value }))}
                  required
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="leave-form-grid">
                <label>
                  Start date
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(event) => setFormState((current) => ({ ...current, endDate: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <label>
                Days used
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={formState.daysUsed}
                  onChange={(event) => setFormState((current) => ({ ...current, daysUsed: event.target.value }))}
                  required
                />
              </label>

              <label>
                Reason
                <textarea
                  rows="3"
                  value={formState.reason}
                  onChange={(event) => setFormState((current) => ({ ...current, reason: event.target.value }))}
                />
              </label>

              <label>
                Status
                <select
                  value={formState.status}
                  onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </label>

              {recordType === "sick" ? (
                <div className="sick-cert-panel">
                  <label>
                    Medical certificate
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(event) => setMedicalCertFile(event.target.files?.[0] || null)}
                    />
                  </label>

                  {editingRecordId && existingMedicalCert ? (
                    <div className="existing-cert-row">
                      <span>Current file: {existingMedicalCert}</span>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setRemoveMedicalCert(true);
                          setExistingMedicalCert("");
                        }}
                      >
                        Remove certificate
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
