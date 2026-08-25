export async function loginRequest(username, password) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to log in");
  }

  return data;
}

export async function fetchCurrentUser(token) {
  const response = await fetch("/api/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load session");
  }

  return data;
}

export async function changePasswordRequest(token, currentPassword, newPassword) {
  const response = await fetch("/api/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to update password");
  }

  return data;
}

export async function fetchEmployees(token) {
  const response = await fetch("/api/employees", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load employees");
  }

  return data;
}

export async function createEmployee(token, name, department, passportId) {
  const response = await fetch("/api/employees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      department,
      passport_id: passportId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to create employee");
  }

  return data;
}

export async function updateEmployee(token, employeeId, name, department, passportId) {
  const response = await fetch(`/api/employees/${employeeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      department,
      passport_id: passportId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to update employee");
  }

  return data;
}

export async function fetchEmployeeStartup(token, employeeId) {
  const response = await fetch(`/api/employees/${employeeId}/startup`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load employee startup data");
  }

  return data;
}

export async function fetchEmployee(token, employeeId) {
  const response = await fetch(`/api/employees/${employeeId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load employee");
  }

  return data;
}

export async function fetchAnnualLeave(token, employeeId = null) {
  const query = employeeId ? `?employee_id=${encodeURIComponent(employeeId)}` : "";
  const response = await fetch(`/api/annual-leave${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load annual leave");
  }

  return data;
}

export async function createAnnualLeave(token, payload) {
  const response = await fetch("/api/annual-leave", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to create annual leave");
  }

  return data;
}

export async function updateAnnualLeave(token, leaveId, payload) {
  const response = await fetch(`/api/annual-leave/${leaveId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to update annual leave");
  }

  return data;
}

export async function deleteAnnualLeave(token, leaveId) {
  const response = await fetch(`/api/annual-leave/${leaveId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to delete annual leave");
  }

  return data;
}

export async function fetchSickLeave(token, employeeId = null) {
  const query = employeeId ? `?employee_id=${encodeURIComponent(employeeId)}` : "";
  const response = await fetch(`/api/sick-leave${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load sick leave");
  }

  return data;
}

export async function fetchEmployeeLeaveReport(token) {
  const response = await fetch("/api/employee-leave/report", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load employee leave report");
  }

  return data;
}

export async function createSickLeave(token, formData) {
  const response = await fetch("/api/sick-leave", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to create sick leave");
  }

  return data;
}

export async function updateSickLeave(token, leaveId, formData) {
  const response = await fetch(`/api/sick-leave/${leaveId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to update sick leave");
  }

  return data;
}

export async function deleteSickLeave(token, leaveId) {
  const response = await fetch(`/api/sick-leave/${leaveId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to delete sick leave");
  }

  return data;
}

export async function fetchUniformIssue(token, employeeId) {
  const response = await fetch(`/api/employees/${employeeId}/uniform-issue-workbook`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load uniform issue");
  }

  return data;
}

export async function downloadUniformIssueWorkbook(token, employeeId, filename) {
  const blob = await fetchFileBlob(token, `/api/employees/${employeeId}/uniform-issue-workbook/download`);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}

export async function downloadUniformCareLetter(token, employeeId, filename) {
  const blob = await fetchFileBlob(token, `/api/employees/${employeeId}/uniform-care-letter/download`);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}

export async function saveUniformIssue(token, employeeId, rows) {
  const response = await fetch(`/api/employees/${employeeId}/documents/uniform_issue/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ rows }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to save uniform issue");
  }

  return data;
}

export async function saveEmployeeStartup(token, employeeId, checklist) {
  const response = await fetch(`/api/employees/${employeeId}/startup`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ checklist }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to save employee startup data");
  }

  return data;
}

export async function fetchContractFiles(token, employeeId) {
  const response = await fetch(`/api/employees/${employeeId}/contract-files`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load contract files");
  }

  return data;
}

export async function uploadContractFiles(token, employeeId, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`/api/employees/${employeeId}/contract-files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to upload contract files");
  }

  return data;
}

export async function deleteContractFile(token, fileId) {
  const response = await fetch(`/api/contract-files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to delete contract file");
  }

  return data;
}

async function fetchFileBlob(token, url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Unable to load file");
  }

  return response.blob();
}

export async function viewContractFile(token, fileId) {
  const blob = await fetchFileBlob(token, `/api/contract-files/${fileId}/view`);
  const objectUrl = window.URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}

export async function downloadContractFile(token, fileId, filename) {
  const blob = await fetchFileBlob(token, `/api/contract-files/${fileId}/download`);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}

export async function fetchEmployeeDocuments(token, employeeId, documentType) {
  const response = await fetch(`/api/employees/${employeeId}/documents/${documentType}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to load documents");
  }

  return data;
}

export async function uploadEmployeeDocuments(token, employeeId, documentType, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`/api/employees/${employeeId}/documents/${documentType}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to upload documents");
  }

  return data;
}

export async function deleteEmployeeDocument(token, documentId) {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to delete file");
  }

  return data;
}

export async function viewEmployeeDocument(token, documentId) {
  const blob = await fetchFileBlob(token, `/api/documents/${documentId}/view`);
  const objectUrl = window.URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}

export async function downloadEmployeeDocument(token, documentId, filename) {
  const blob = await fetchFileBlob(token, `/api/documents/${documentId}/download`);
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
}
