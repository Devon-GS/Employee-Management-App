import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteContractFile,
  downloadContractFile,
  fetchContractFiles,
  fetchEmployeeStartup,
  saveEmployeeStartup,
  uploadContractFiles,
  viewContractFile,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import Navbar from "../components/Navbar";

const STARTUP_ITEMS = [
  { label: "Contract", requiresDate: false, isContract: true },
  { label: "Contract Status", requiresDate: false },
  { label: "Permit Status", requiresDate: true },
  { label: "Passport / ID Copy", requiresDate: false },
  { label: "Permit Copy", requiresDate: false },
  { label: "Job Description", requiresDate: false },
  { label: "Name for file & Name Badge", requiresDate: false },
  { label: "Uniform & Uniform Letter & Uniform Sizes Onto Chart & Employ No. & Badge No.", requiresDate: false },
  { label: "Start", requiresDate: true },
  { label: "UIF", requiresDate: true },
  { label: "MIBCO reg", requiresDate: true },
  { label: "Open Weekly Deduction Sheet", requiresDate: false },
  { label: "Disciplinary Spreadsheet & Permit Spreadsheet", requiresDate: false },
  { label: "Phone No. onto Contacts List", requiresDate: false },
  { label: "Staff Instructions / Training Pack", requiresDate: false },
];

const CONTRACT_FILE_TYPES = ".pdf,.doc,.docx,.jpg,.jpeg";

function buildDefaultChecklist() {
  return STARTUP_ITEMS.reduce((accumulator, item) => {
    accumulator[item.label] = { done: false, na: false, date: "" };
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
  const [contractFiles, setContractFiles] = useState([]);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractMessage, setContractMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

  async function loadContractFiles() {
    setContractLoading(true);
    setContractError("");

    try {
      const files = await fetchContractFiles(token, employeeId);
      setContractFiles(files);
    } catch (err) {
      setContractError(err.message || "Unable to load contract files");
    } finally {
      setContractLoading(false);
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
        for (const item of STARTUP_ITEMS) {
          const itemState = data.startup_data?.[item.label] || {};
          loadedChecklist[item.label] = {
            done: Boolean(itemState.done),
            na: Boolean(itemState.na),
            date: itemState.date || "",
          };
        }

        setEmployeeName(data.employee_name);
        setChecklist(loadedChecklist);
        setAutoSaveReady(true);
        setIsDirty(false);

        try {
          const files = await fetchContractFiles(token, employeeId);
          if (mounted) {
            setContractFiles(files);
          }
        } catch {
          if (mounted) {
            setContractFiles([]);
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
    if (!contractModalOpen) {
      return undefined;
    }

    loadContractFiles();
    return undefined;
  }, [contractModalOpen, employeeId, token]);

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

  function openContractModal() {
    setContractModalOpen(true);
    setContractError("");
    setContractMessage("");
    setSelectedFiles([]);
  }

  function closeContractModal() {
    if (!contractUploading) {
      setContractModalOpen(false);
      setContractError("");
      setContractMessage("");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleContractUpload() {
    if (!selectedFiles.length) {
      setContractError("Please choose at least one file.");
      return;
    }

    setContractUploading(true);
    setContractError("");
    setContractMessage("");

    try {
      await uploadContractFiles(token, employeeId, selectedFiles);
      setContractMessage("Files uploaded successfully.");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadContractFiles();
    } catch (err) {
      setContractError(err.message || "Unable to upload contract files");
    } finally {
      setContractUploading(false);
    }
  }

  async function handleView(fileId) {
    try {
      await viewContractFile(token, fileId);
    } catch (err) {
      setContractError(err.message || "Unable to view file");
    }
  }

  async function handleDownload(file) {
    try {
      await downloadContractFile(token, file.id, file.original_filename);
    } catch (err) {
      setContractError(err.message || "Unable to download file");
    }
  }

  async function handleDelete(fileId) {
    const confirmed = window.confirm("Delete this uploaded contract file?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteContractFile(token, fileId);
      await loadContractFiles();
      setContractMessage("File deleted successfully.");
    } catch (err) {
      setContractError(err.message || "Unable to delete file");
    }
  }

  const contractUploadLabel =
    contractFiles.length > 0 ? `${contractFiles.length} Uploaded` : "0 Uploaded";

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
                <th>Uploads / Status</th>
              </tr>
            </thead>
            <tbody>
              {STARTUP_ITEMS.map((item) => {
                const row = checklist[item.label] || { done: false, na: false, date: "" };
                const rowClass = row.done ? "startup-row-done" : row.na ? "startup-row-na" : "";
                return (
                  <tr key={item.label} className={rowClass}>
                    <td>
                      {item.isContract ? (
                        <button type="button" className="startup-link" onClick={openContractModal}>
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
                      {item.requiresDate ? (
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
                    <td>{item.isContract ? contractUploadLabel : <span className="muted-cell">-</span>}</td>
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

      {contractModalOpen ? (
        <div className="modal-backdrop" onClick={closeContractModal}>
          <div className="modal-card contract-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Contract Files</h2>
              <button className="icon-button" type="button" onClick={closeContractModal}>
                ×
              </button>
            </div>

            <div className="contract-upload-area">
              <label className="file-picker">
                <span>Choose contract file(s)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CONTRACT_FILE_TYPES}
                  multiple
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                />
              </label>

              <button
                className="primary-button"
                type="button"
                onClick={handleContractUpload}
                disabled={contractUploading}
              >
                {contractUploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {contractError ? <div className="error-banner">{contractError}</div> : null}
            {contractMessage ? <div className="success-banner">{contractMessage}</div> : null}

            <div className="contract-file-list">
              {contractLoading ? (
                <div className="table-state">Loading contract files...</div>
              ) : contractFiles.length === 0 ? (
                <div className="table-state">No contract files uploaded yet.</div>
              ) : (
                contractFiles.map((file) => (
                  <div key={file.id} className="contract-file-row">
                    <div className="contract-file-meta">
                      <strong>{file.original_filename}</strong>
                      <span>{formatBytes(file.size_bytes)}</span>
                    </div>
                    <div className="table-actions">
                      <button className="secondary-button" type="button" onClick={() => handleView(file.id)}>
                        View
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleDownload(file)}>
                        Download
                      </button>
                      <button className="secondary-button" type="button" onClick={() => handleDelete(file.id)}>
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
    </main>
  );
}
