import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createEmployee,
  deleteEmployeeDocument,
  downloadEmployeeDocument,
  fetchEmployeeDocuments,
  fetchEmployees,
  updateEmployee,
  uploadEmployeeDocuments,
  viewEmployeeDocument,
} from "../api";
import Navbar from "../components/Navbar";

const DEPARTMENT_OPTIONS = ["Forecourt", "Cashier", "Baker", "Car Wash"];
const ALLOWED_FILE_TYPES = ".pdf,.doc,.docx,.jpg,.jpeg,.xls,.xlsx";
const DOCUMENT_LABELS = {
  bank_acc: "Bank Acc",
  written_warning: "Written Warning",
  general: "General",
};

function formatBytes(bytes) {
  if (bytes === 0) {
    return "0 B";
  }

  if (!bytes) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [passportId, setPassportId] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeDocumentEmployeeId, setActiveDocumentEmployeeId] = useState(null);
  const [activeDocumentType, setActiveDocumentType] = useState(null);
  const [activeDocumentTitle, setActiveDocumentTitle] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [documentMessage, setDocumentMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

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
    setHireDate(employee?.hire_date ?? new Date().toISOString().slice(0, 10));
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

  async function openDocumentModal(employeeId, documentType) {
    setActiveDocumentEmployeeId(employeeId);
    setActiveDocumentType(documentType);
    setActiveDocumentTitle(DOCUMENT_LABELS[documentType] || "Documents");
    setDocumentError("");
    setDocumentMessage("");
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setDocumentLoading(true);
    try {
      const data = await fetchEmployeeDocuments(token, employeeId, documentType);
      setDocuments(data);
    } catch (err) {
      setDocuments([]);
      setDocumentError(err.message || "Unable to load uploaded files");
    } finally {
      setDocumentLoading(false);
    }
  }

  function closeDocumentModal() {
    if (!documentUploading) {
      setActiveDocumentEmployeeId(null);
      setActiveDocumentType(null);
      setActiveDocumentTitle("");
      setDocuments([]);
      setDocumentError("");
      setDocumentMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDocumentUpload() {
    if (!activeDocumentType) {
      return;
    }

    if (!selectedFiles.length) {
      setDocumentError("Please choose at least one file.");
      return;
    }

    setDocumentUploading(true);
    setDocumentError("");
    setDocumentMessage("");

    try {
      await uploadEmployeeDocuments(token, activeDocumentEmployeeId, activeDocumentType, selectedFiles);
      const refreshed = await fetchEmployeeDocuments(token, activeDocumentEmployeeId, activeDocumentType);
      setDocuments(refreshed);
      setDocumentMessage("Files uploaded successfully.");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setDocumentError(err.message || "Unable to upload files");
    } finally {
      setDocumentUploading(false);
    }
  }

  async function handleViewDocument(documentId) {
    try {
      await viewEmployeeDocument(token, documentId);
    } catch (err) {
      setDocumentError(err.message || "Unable to view file");
    }
  }

  async function handleDownloadDocument(document) {
    try {
      await downloadEmployeeDocument(token, document.id, document.original_filename);
    } catch (err) {
      setDocumentError(err.message || "Unable to download file");
    }
  }

  async function handleDeleteDocument(documentId) {
    const confirmed = window.confirm("Delete this uploaded file?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteEmployeeDocument(token, documentId);
      const refreshed = await fetchEmployeeDocuments(token, activeDocumentEmployeeId, activeDocumentType);
      setDocuments(refreshed);
      setDocumentMessage("File deleted successfully.");
    } catch (err) {
      setDocumentError(err.message || "Unable to delete file");
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
        ? await updateEmployee(token, editingEmployeeId, name, department, passportId, hireDate)
        : await createEmployee(token, name, department, passportId, hireDate);

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
                  <th>Hire date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.department || "-"}</td>
                    <td>{employee.passport_id}</td>
                    <td>{employee.hire_date || "-"}</td>
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
                          View
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => openDocumentModal(employee.id, "bank_acc")}
                        >
                          Bank Acc
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => openDocumentModal(employee.id, "written_warning")}
                        >
                          Written Warning
                        </button>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => openDocumentModal(employee.id, "general")}
                        >
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

      {activeDocumentType ? (
        <div className="modal-backdrop" onClick={closeDocumentModal}>
          <div className="modal-card contract-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{activeDocumentTitle}</h2>
              <button className="icon-button" type="button" onClick={closeDocumentModal}>
                ×
              </button>
            </div>

            <div className="contract-upload-area">
              <label className="file-picker">
                <span>Choose file(s)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_FILE_TYPES}
                  multiple
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                />
              </label>

              <button className="primary-button" type="button" onClick={handleDocumentUpload} disabled={documentUploading}>
                {documentUploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {documentError ? <div className="error-banner">{documentError}</div> : null}
            {documentMessage ? <div className="success-banner">{documentMessage}</div> : null}

            <div className="contract-file-list">
              {documentLoading ? (
                <div className="table-state">Loading uploaded files...</div>
              ) : documents.length === 0 ? (
                <div className="table-state">No uploaded files yet.</div>
              ) : (
                documents.map((document) => (
                  <div key={document.id} className="contract-file-row">
                    <div className="contract-file-meta">
                      <strong>{document.original_filename}</strong>
                      <span>{formatBytes(document.size_bytes)}</span>
                    </div>
                    <div className="table-actions">
                      <button className="secondary-button" type="button" onClick={() => handleViewDocument(document.id)}>
                        View
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleDownloadDocument(document)}>
                        Download
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleDeleteDocument(document.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

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
              <label>
                Hire date
                <input
                  type="date"
                  value={hireDate}
                  onChange={(event) => setHireDate(event.target.value)}
                  required
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
