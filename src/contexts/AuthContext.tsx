import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface User {
  name: string;
  email: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("dfs_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const u: User = { name, email, initials };
    setUser(u);
    localStorage.setItem("dfs_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("dfs_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
