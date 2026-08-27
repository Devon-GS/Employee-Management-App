import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ArchivedEmployeesPage from "./pages/ArchivedEmployeesPage";
import EditUniformPage from "./pages/EditUniformPage";
import EmployeeLeavePage from "./pages/EmployeeLeavePage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import EmployeeStartupPage from "./pages/EmployeeStartupPage";
import EmployeesPage from "./pages/EmployeesPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-leave"
        element={
          <ProtectedRoute>
            <EmployeeLeavePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/archived-employees"
        element={
          <ProtectedRoute>
            <ArchivedEmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/achieved-employees" element={<Navigate to="/archived-employees" replace />} />
      <Route
        path="/employees/:employeeId/startup"
        element={
          <ProtectedRoute>
            <EmployeeStartupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:employeeId/profile"
        element={
          <ProtectedRoute>
            <EmployeeProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:employeeId/edit-uniform"
        element={
          <ProtectedRoute>
            <EditUniformPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
