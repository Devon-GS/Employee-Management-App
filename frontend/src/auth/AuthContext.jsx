import { createContext, useContext, useEffect, useState } from "react";
import { fetchCurrentUser, loginRequest } from "../api";

const AuthContext = createContext(null);
const TOKEN_KEY = "employee-app-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser(token);
        if (mounted) {
          setUser(currentUser);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [token]);

  async function login(username, password) {
    const result = await loginRequest(username, password);
    localStorage.setItem(TOKEN_KEY, result.access_token);
    setToken(result.access_token);
    const currentUser = await fetchCurrentUser(result.access_token);
    setUser(currentUser);
    return currentUser;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
