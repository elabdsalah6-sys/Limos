import { createContext, useContext, useState } from "react";
import safeStorage from "../utils/safeStorage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    safeStorage.getItem("user")
      ? JSON.parse(safeStorage.getItem("user"))
      : null,
  );

  const login = (userData) => {
    safeStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    safeStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
