import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  downloadEmployeeDocument,
  fetchEmployeeDocuments,
  fetchEmployeeProfile,
  fetchSickLeave,
  viewEmployeeDocument,
  viewSickLeaveMedicalCert,
} from "../api";
import Navbar from "../components/Navbar";

const DOCUMENT_GROUPS = [
  { key: "written_warning", label: "Warnings", title: "Written Warnings" },
  { key: "bank_acc", label: "Bank Acc", title: "Bank Account Documents" },
  { key: "general", label: "General", title: "General Documents" },
];

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDays(value) {
  const amount = Number.parseFloat(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

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

export default function EmployeeProfilePage() {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState({
    written_warning: [],
    bank_acc: [],
    general: [],
  });
  const [medicalCerts, setMedicalCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [error, setError] = useState("");
  const [documentError, setDocumentError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setDocumentLoading(true);
      setError("");
      setDocumentError("");

      try {
        const [profileData, warningData, bankAccData, generalData, sickLeaveData] = await Promise.all([
          fetchEmployeeProfile(token, employeeId),
          fetchEmployeeDocuments(token, employeeId, "written_warning"),
          fetchEmployeeDocuments(token, employeeId, "bank_acc"),
          fetchEmployeeDocuments(token, employeeId, "general"),
          fetchSickLeave(token, employeeId),
        ]);

        if (!mounted) {
          return;
        }

        setProfile(profileData);
        setDocuments({
          written_warning: warningData,
          bank_acc: bankAccData,
          general: generalData,
        });
        setMedicalCerts((sickLeaveData || []).filter((leave) => leave.medical_cert));
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load employee profile");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setDocumentLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [employeeId, token]);

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

  async function handleViewMedicalCert(leaveId) {
    try {
      await viewSickLeaveMedicalCert(token, leaveId);
    } catch (err) {
      setDocumentError(err.message || "Unable to view medical certificate");
    }
  }

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="dashboard-shell">
      <Navbar title="Employee Profile" />
      <section className="content-panel employee-profile-panel">
        {error ? <div className="error-banner">{error}</div> : null}
        {documentError ? <div className="error-banner">{documentError}</div> : null}

        {loading ? (
          <div className="table-state">Loading employee profile...</div>
        ) : profile ? (
          <>
            <div className="profile-hero">
              <div className="profile-summary-card">
                <div className="profile-name-block">
                  <p className="eyebrow">Employee Details</p>
                  <h2>{profile.name}</h2>
                  <p className="subtitle">
                    Department {profile.department || "Not set"} | Passport/ID {profile.passport_id}
                  </p>
                  {profile.archived ? <span className="status-pill archived">Archived</span> : null}
                </div>

                <div className="profile-summary-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => navigate(profile.archived ? "/archived-employees" : "/employees")}
                  >
                    Back to {profile.archived ? "Archived Employees" : "Employees"}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => navigate(`/employees/${employeeId}/startup`)}>
                    View Startup
                  </button>
                </div>
              </div>

              {/* <div className="profile-link-row" aria-label="Jump to document sections">
                {DOCUMENT_GROUPS.map((group) => (
                  <button
                    key={group.key}
                    className="profile-jump-button"
                    type="button"
                    onClick={() => scrollToSection(`document-section-${group.key}`)}
                  >
                    {group.label}
                  </button>
                ))}
              </div> */}

              <div className="profile-stats-grid">
                <article className="profile-stat-card">
                  <span className="stat-label">Permanent contract start date</span>
                  <strong className="profile-stat-value">{formatDate(profile.permanent_contract_start_date)}</strong>
                </article>
                <article className="profile-stat-card">
                  <span className="stat-label">Permit expire date</span>
                  <strong className="profile-stat-value">{formatDate(profile.permit_expire_date)}</strong>
                </article>
                <article className="profile-stat-card highlight">
                  <span className="stat-label">Annual leave remaining</span>
                  <strong className="profile-stat-value">{formatDays(profile.annual_leave_balance)}</strong>
                  <span className="stat-unit">days</span>
                </article>
                <article className="profile-stat-card highlight">
                  <span className="stat-label">Sick leave remaining</span>
                  <strong className="profile-stat-value">{formatDays(profile.sick_leave_balance)}</strong>
                  <span className="stat-unit">days</span>
                </article>
              </div>
            </div>

            <div className="profile-documents">
              {DOCUMENT_GROUPS.map((group) => {
                const groupDocuments = documents[group.key] || [];

                return (
                  <section
                    key={group.key}
                    id={`document-section-${group.key}`}
                    className="profile-document-section"
                  >
                    <div className="leave-section-header">
                      <div>
                        <h2>{group.title}</h2>
                        <p>View the files stored under this document group for the employee.</p>
                      </div>
                    </div>

                    <div className="table-wrap">
                      {documentLoading ? (
                        <div className="table-state">Loading documents...</div>
                      ) : group.key === "general" ? (
                        <div className="profile-document-stack">
                          <div className="profile-document-list">
                            {groupDocuments.length === 0 ? (
                              <div className="table-state">No general files uploaded yet.</div>
                            ) : (
                              groupDocuments.map((document) => (
                                <article key={document.id} className="profile-document-card">
                                  <div className="profile-document-meta">
                                    <strong>{document.original_filename}</strong>
                                    <span>{formatBytes(document.size_bytes)}</span>
                                  </div>
                                  <div className="table-actions">
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      onClick={() => handleViewDocument(document.id)}
                                    >
                                      View
                                    </button>
                                    <button
                                      className="secondary-button"
                                      type="button"
                                      onClick={() => handleDownloadDocument(document)}
                                    >
                                      Download
                                    </button>
                                  </div>
                                </article>
                              ))
                            )}
                          </div>

                          <div className="profile-document-section">
                            <div className="leave-section-header">
                              <div>
                                <h2>Medical Certificates</h2>
                                <p>View all medical certificate uploads attached to this employee's sick leave records.</p>
                              </div>
                            </div>
                            {medicalCerts.length === 0 ? (
                              <div className="table-state">No medical certificates uploaded yet.</div>
                            ) : (
                              <div className="profile-document-list">
                                {medicalCerts.map((leave) => (
                                  <article key={leave.id} className="profile-document-card">
                                    <div className="profile-document-meta">
                                      <strong>{leave.medical_cert}</strong>
                                      <span>
                                        {leave.start_date} to {leave.end_date}
                                      </span>
                                    </div>
                                    <div className="table-actions">
                                      <button
                                        className="secondary-button"
                                        type="button"
                                        onClick={() => handleViewMedicalCert(leave.id)}
                                      >
                                        View
                                      </button>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : groupDocuments.length === 0 ? (
                        <div className="table-state">No {group.label.toLowerCase()} files uploaded yet.</div>
                      ) : (
                        <div className="profile-document-list">
                          {groupDocuments.map((document) => (
                            <article key={document.id} className="profile-document-card">
                              <div className="profile-document-meta">
                                <strong>{document.original_filename}</strong>
                                <span>{formatBytes(document.size_bytes)}</span>
                              </div>
                              <div className="table-actions">
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => handleViewDocument(document.id)}
                                >
                                  View
                                </button>
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => handleDownloadDocument(document)}
                                >
                                  Download
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
