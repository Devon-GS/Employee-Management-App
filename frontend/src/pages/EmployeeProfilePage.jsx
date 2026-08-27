import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  downloadEmployeeDocument,
  fetchEmployeeDocuments,
  fetchEmployeeProfile,
  viewEmployeeDocument,
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
        const [profileData, warningData, bankAccData, generalData] = await Promise.all([
          fetchEmployeeProfile(token, employeeId),
          fetchEmployeeDocuments(token, employeeId, "written_warning"),
          fetchEmployeeDocuments(token, employeeId, "bank_acc"),
          fetchEmployeeDocuments(token, employeeId, "general"),
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
        <div className="employees-toolbar employee-profile-toolbar">
          <div className="panel-copy">
            <p className="eyebrow">Employee Profile</p>
            <h1>{profile?.name || "Employee"}</h1>
            <p className="subtitle">
              A quick profile view with employment dates, leave balances, and employee documents.
            </p>
          </div>
          <div className="profile-toolbar-actions">
            <button className="secondary-button" type="button" onClick={() => navigate("/employees")}>
              Back to Employees
            </button>
            <button className="secondary-button" type="button" onClick={() => navigate(`/employees/${employeeId}/startup`)}>
              View Startup
            </button>
          </div>
        </div>

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
                </div>

                <div className="profile-link-row" aria-label="Jump to document sections">
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
                </div>
              </div>

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
