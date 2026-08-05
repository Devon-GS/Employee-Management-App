import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteContractFile,
  deleteEmployeeDocument,
  downloadContractFile,
  downloadEmployeeDocument,
  fetchContractFiles,
  fetchEmployeeDocuments,
  fetchEmployeeStartup,
  saveEmployeeStartup,
  uploadContractFiles,
  uploadEmployeeDocuments,
  viewContractFile,
  viewEmployeeDocument,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";

const DOCUMENT_ROWS = [
  { label: "Contract", documentType: "contract", isStatus: false },
  { label: "Contract Status", isStatus: true },
  { label: "Permit Status", isStatus: false },
  { label: "Passport / ID Copy", documentType: "passport_id_copy", isStatus: false },
  { label: "Permit Copy", documentType: "permit_copy", isStatus: false },
  { label: "Name for file & Name Badge", isStatus: false },
  { label: "Uniform & Uniform Letter & Uniform Sizes Onto Chart & Employ No. & Badge No.", isStatus: false },
  { label: "Start", isStatus: false },
  { label: "UIF", isStatus: false },
  { label: "MIBCO reg", isStatus: false },
  { label: "Open Weekly Deduction Sheet", isStatus: false },
  { label: "Disciplinary Spreadsheet & Permit Spreadsheet", isStatus: false },
  { label: "Phone No. onto Contacts List", isStatus: false },
  { label: "Staff Instructions / Training Pack / Job Description", isStatus: false },
];

const CONTRACT_STATUS_OPTIONS = ["Seasonal/Temporary", "Permanent"];
const ALLOWED_FILE_TYPES = ".pdf,.doc,.docx,.jpg,.jpeg";
const DOCUMENT_LABELS = {
  contract: "Contract",
  passport_id_copy: "Passport / ID Copy",
  permit_copy: "Permit Copy",
};

function buildDefaultChecklist() {
  return DOCUMENT_ROWS.reduce((accumulator, item) => {
    accumulator[item.label] = {
      done: false,
      na: false,
      date: "",
      status: "",
      info: "",
      on_system: false,
    };
    if (item.label === "Contract Status") {
      accumulator[item.label] = {
        done: false,
        na: false,
        date: "",
        status: "",
        info: "",
        on_system: false,
      };
    }
    return accumulator;
  }, {});
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) {
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

function getContractStatusRow(checklist) {
  return checklist["Contract Status"] || {
    done: false,
    na: false,
    date: "",
    status: "",
    info: "",
    on_system: false,
  };
}

function emptyDocumentGroups() {
  return {
    contract: [],
    passport_id_copy: [],
    permit_copy: [],
  };
}

export default function EmployeeStartupPage() {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [employeeName, setEmployeeName] = useState("");
  const [checklist, setChecklist] = useState(buildDefaultChecklist);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveReady, setAutoSaveReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [documentGroups, setDocumentGroups] = useState(emptyDocumentGroups);
  const [activeDocumentType, setActiveDocumentType] = useState(null);
  const [activeDocumentTitle, setActiveDocumentTitle] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [documentMessage, setDocumentMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [contractStatusModalOpen, setContractStatusModalOpen] = useState(false);
  const [contractStatusDraft, setContractStatusDraft] = useState({
    status: "",
    date: "",
    on_system: false,
  });
  const [contractStatusSaving, setContractStatusSaving] = useState(false);
  const [contractStatusError, setContractStatusError] = useState("");

  async function loadDocumentsForType(documentType) {
    if (documentType === "contract") {
      return fetchContractFiles(token, employeeId);
    }
    return fetchEmployeeDocuments(token, employeeId, documentType);
  }

  async function refreshDocumentGroups() {
    setDocumentLoading(true);
    setDocumentError("");

    try {
      const [contract, passportIdCopy, permitCopy] = await Promise.all([
        loadDocumentsForType("contract"),
        loadDocumentsForType("passport_id_copy"),
        loadDocumentsForType("permit_copy"),
      ]);

      setDocumentGroups({
        contract,
        passport_id_copy: passportIdCopy,
        permit_copy: permitCopy,
      });
    } catch (err) {
      setDocumentError(err.message || "Unable to load uploaded files");
    } finally {
      setDocumentLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadStartup() {
      try {
        const data = await fetchEmployeeStartup(token, employeeId);
        if (!mounted) {
          return;
        }

        const loadedChecklist = buildDefaultChecklist();
        for (const item of DOCUMENT_ROWS) {
          const itemState = data.startup_data?.[item.label] || {};
          loadedChecklist[item.label] = {
            done: Boolean(itemState.done),
            na: Boolean(itemState.na),
            date: itemState.date || "",
            status: itemState.status || "",
            info: itemState.info || "",
            on_system: Boolean(itemState.on_system),
          };
        }

        setEmployeeName(data.employee_name);
        setChecklist(loadedChecklist);
        const contractStatusRow = loadedChecklist["Contract Status"];
        setContractStatusDraft({
          status: contractStatusRow.status || "",
          date: contractStatusRow.date || "",
          on_system: Boolean(contractStatusRow.on_system),
        });
        setAutoSaveReady(true);
        setIsDirty(false);

        try {
          const [contract, passportIdCopy, permitCopy] = await Promise.all([
            loadDocumentsForType("contract"),
            loadDocumentsForType("passport_id_copy"),
            loadDocumentsForType("permit_copy"),
          ]);
          if (mounted) {
            setDocumentGroups({
              contract,
              passport_id_copy: passportIdCopy,
              permit_copy: permitCopy,
            });
          }
        } catch {
          if (mounted) {
            setDocumentGroups(emptyDocumentGroups());
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load startup details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadStartup();

    return () => {
      mounted = false;
    };
  }, [token, employeeId]);

  useEffect(() => {
    if (!autoSaveReady || loading || !isDirty) {
      return undefined;
    }

    setSaving(true);
    setMessage("");

    const timer = window.setTimeout(async () => {
      try {
        await saveEmployeeStartup(token, employeeId, checklist);
        setError("");
        setMessage("Auto-saved.");
        setIsDirty(false);
      } catch (err) {
        setError(err.message || "Unable to save startup details");
      } finally {
        setSaving(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [autoSaveReady, checklist, employeeId, isDirty, loading, token]);

  function updateRow(label, changes) {
    setIsDirty(true);
    setChecklist((current) => ({
      ...current,
      [label]: {
        ...current[label],
        ...changes,
      },
    }));
  }

  function openDocumentModal(documentType) {
    setActiveDocumentType(documentType);
    setActiveDocumentTitle(DOCUMENT_LABELS[documentType]);
    setDocumentError("");
    setDocumentMessage("");
    setSelectedFiles([]);
  }

  function closeDocumentModal() {
    if (!documentUploading) {
      setActiveDocumentType(null);
      setActiveDocumentTitle("");
      setDocumentError("");
      setDocumentMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function openContractStatusModal() {
    const row = getContractStatusRow(checklist);
    setContractStatusDraft({
      status: row.status || row.info || "",
      date: row.date || "",
      on_system: Boolean(row.on_system),
    });
    setContractStatusError("");
    setContractStatusModalOpen(true);
  }

  function handleContractStatusDateChange(date) {
    setContractStatusDraft((current) => ({
      ...current,
      date,
    }));
    updateRow("Contract Status", { date });
  }

  function handlePermitStatusDateChange(date) {
    updateRow("Permit Status", {
      date,
      done: Boolean(date),
      na: false,
    });
  }

  function closeContractStatusModal() {
    if (!contractStatusSaving) {
      setContractStatusModalOpen(false);
      setContractStatusError("");
    }
  }

  async function handleDocumentUpload() {
    if (!selectedFiles.length || !activeDocumentType) {
      setDocumentError("Please choose at least one file.");
      return;
    }

    setDocumentUploading(true);
    setDocumentError("");
    setDocumentMessage("");

    try {
      if (activeDocumentType === "contract") {
        await uploadContractFiles(token, employeeId, selectedFiles);
      } else {
        await uploadEmployeeDocuments(token, employeeId, activeDocumentType, selectedFiles);
      }

      setDocumentMessage("Files uploaded successfully.");
      updateRow(DOCUMENT_LABELS[activeDocumentType], { done: true, na: false });
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await refreshDocumentGroups();
    } catch (err) {
      setDocumentError(err.message || "Unable to upload files");
    } finally {
      setDocumentUploading(false);
    }
  }

  async function handleViewDocument(documentId) {
    try {
      if (activeDocumentType === "contract") {
        await viewContractFile(token, documentId);
      } else {
        await viewEmployeeDocument(token, documentId);
      }
    } catch (err) {
      setDocumentError(err.message || "Unable to view file");
    }
  }

  async function handleDownloadDocument(document) {
    try {
      if (activeDocumentType === "contract") {
        await downloadContractFile(token, document.id, document.original_filename);
      } else {
        await downloadEmployeeDocument(token, document.id, document.original_filename);
      }
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
      if (activeDocumentType === "contract") {
        await deleteContractFile(token, documentId);
      } else {
        await deleteEmployeeDocument(token, documentId);
      }
      await refreshDocumentGroups();
      setDocumentMessage("File deleted successfully.");
    } catch (err) {
      setDocumentError(err.message || "Unable to delete file");
    }
  }

  async function handleContractStatusSave() {
    setContractStatusSaving(true);
    setContractStatusError("");
    setMessage("");

    const isPermanent = contractStatusDraft.status === "Permanent";
    const nextStatusDate = contractStatusDraft.date;
    const nextChecklist = {
      ...checklist,
      Contract: {
        ...checklist.Contract,
        done: true,
        na: false,
      },
      "Contract Status": {
        ...checklist["Contract Status"],
        done: true,
        na: false,
        date: nextStatusDate,
        status: contractStatusDraft.status,
        info: contractStatusDraft.status,
        on_system: contractStatusDraft.on_system,
      },
      Start: {
        ...checklist.Start,
        date: contractStatusDraft.on_system ? nextStatusDate : "",
        done: contractStatusDraft.on_system ? true : false,
        na: contractStatusDraft.on_system ? false : checklist.Start.na,
      },
      UIF: {
        ...checklist.UIF,
        date: isPermanent ? nextStatusDate : "",
        done: isPermanent ? true : false,
        na: false,
      },
      "MIBCO reg": {
        ...checklist["MIBCO reg"],
        date: isPermanent ? nextStatusDate : "",
        done: isPermanent ? true : false,
        na: false,
      },
    };

    try {
      await saveEmployeeStartup(token, employeeId, nextChecklist);
      setChecklist(nextChecklist);
      setIsDirty(false);
      setMessage("Contract status saved successfully.");
      setContractStatusModalOpen(false);
    } catch (err) {
      setContractStatusError(err.message || "Unable to save contract status");
    } finally {
      setContractStatusSaving(false);
    }
  }

  const contractStatusRow = getContractStatusRow(checklist);

  function getDocumentCount(documentType) {
    return documentGroups[documentType]?.length || 0;
  }

  return (
    <main className="dashboard-shell">
      <Navbar title="Employee Startup" />
      <section className="content-panel startup-panel">
        <div className="panel-copy">
          <p className="eyebrow">Employee Startup</p>
          <h1>{loading ? "Loading..." : employeeName}</h1>
          <p className="subtitle">Track onboarding steps, status, and key dates for this employee.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        <div className="table-wrap">
          <table className="startup-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Done</th>
                <th>N/A</th>
                <th>Date</th>
                <th>Information</th>
              </tr>
            </thead>
            <tbody>
              {DOCUMENT_ROWS.map((item) => {
                const row = checklist[item.label] || { done: false, na: false, date: "" };
                const rowClass = row.done ? "startup-row-done" : row.na ? "startup-row-na" : "";
                const infoValue = item.documentType
                  ? `${getDocumentCount(item.documentType)} Uploaded`
                  : item.label === "Contract Status"
                    ? contractStatusRow.info || "-"
                    : "-";

                return (
                  <tr key={item.label} className={rowClass}>
                    <td>
                      {item.documentType ? (
                        <button type="button" className="startup-link" onClick={() => openDocumentModal(item.documentType)}>
                          {item.label}
                        </button>
                      ) : item.label === "Contract Status" ? (
                        <button type="button" className="startup-link" onClick={openContractStatusModal}>
                          {item.label}
                        </button>
                      ) : (
                        item.label
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.done}
                        onChange={(event) =>
                          updateRow(item.label, {
                            done: event.target.checked,
                            na: event.target.checked ? false : row.na,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.na}
                        onChange={(event) =>
                          updateRow(item.label, {
                            na: event.target.checked,
                            done: event.target.checked ? false : row.done,
                          })
                        }
                      />
                    </td>
                    <td>
                      {item.label === "Contract Status" ? (
                        <input
                          type="date"
                          value={contractStatusRow.date || ""}
                          onChange={(event) => handleContractStatusDateChange(event.target.value)}
                          className="date-input"
                        />
                      ) : item.label === "Permit Status" ? (
                        <input
                          type="date"
                          value={row.date}
                          onChange={(event) => handlePermitStatusDateChange(event.target.value)}
                          className="date-input"
                        />
                      ) : item.label === "UIF" || item.label === "MIBCO reg" || item.label === "Start" ? (
                        <input
                          type="date"
                          value={row.date}
                          onChange={(event) => updateRow(item.label, { date: event.target.value })}
                          className="date-input"
                        />
                      ) : (
                        <span className="muted-cell">-</span>
                      )}
                    </td>
                    <td>{infoValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="startup-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/employees")}>
            Back
          </button>
          <span className="autosave-status">{saving ? "Saving..." : isDirty ? "Unsaved changes" : "Saved"}</span>
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

              <button
                className="primary-button"
                type="button"
                onClick={handleDocumentUpload}
                disabled={documentUploading}
              >
                {documentUploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {documentError ? <div className="error-banner">{documentError}</div> : null}
            {documentMessage ? <div className="success-banner">{documentMessage}</div> : null}

            <div className="contract-file-list">
              {documentLoading ? (
                <div className="table-state">Loading uploaded files...</div>
              ) : documentGroups[activeDocumentType]?.length === 0 ? (
                <div className="table-state">No uploaded files yet.</div>
              ) : (
                documentGroups[activeDocumentType]?.map((document) => (
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

      {contractStatusModalOpen ? (
        <div className="modal-backdrop" onClick={closeContractStatusModal}>
          <div className="modal-card contract-status-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Contract Status</h2>
              <button className="icon-button" type="button" onClick={closeContractStatusModal}>
                ×
              </button>
            </div>

            <div className="contract-status-summary">
              <div className="table-state">
                Current status: <strong>{contractStatusDraft.status || "Not set"}</strong>
              </div>
            </div>

            <div className="modal-form">
              <label>
                Contract status
                <select
                  value={contractStatusDraft.status}
                  onChange={(event) =>
                    setContractStatusDraft((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="">Select a status</option>
                  {CONTRACT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={contractStatusDraft.date}
                  onChange={(event) =>
                    setContractStatusDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={contractStatusDraft.on_system}
                  onChange={(event) =>
                    setContractStatusDraft((current) => ({
                      ...current,
                      on_system: event.target.checked,
                    }))
                  }
                />
                On The System
              </label>

              {contractStatusError ? <div className="error-banner">{contractStatusError}</div> : null}

              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={closeContractStatusModal}>
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleContractStatusSave}
                  disabled={contractStatusSaving}
                >
                  {contractStatusSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
