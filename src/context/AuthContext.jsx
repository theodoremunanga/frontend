import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem("token") || null
  );

  const [role, setRole] = useState(
    localStorage.getItem("role") || null
  );

  const login = (data) => {
    // 🔥 STOCKAGE CRITIQUE
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);

    setToken(data.token);
    setRole(data.role);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setToken(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);