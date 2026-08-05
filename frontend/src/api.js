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

export async function createEmployee(token, name, passportId) {
  const response = await fetch("/api/employees", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      passport_id: passportId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Unable to create employee");
  }

  return data;
}
