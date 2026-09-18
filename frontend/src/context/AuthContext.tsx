import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthState, UserIdentity, UserRole } from "../types";

interface AuthContextType extends AuthState {
  login: (user: UserIdentity, token: string, privateKey: string) => void;
  logout: () => void;
  switchRolePreview: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const savedUser = sessionStorage.getItem("smx_user");
    const savedToken = sessionStorage.getItem("smx_token");
    const savedKey = sessionStorage.getItem("smx_pk");

    if (savedUser && savedToken) {
      try {
        return {
          isAuthenticated: true,
          user: JSON.parse(savedUser),
          token: savedToken,
          privateKey: savedKey || null,
        };
      } catch {}
    }
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      privateKey: null,
    };
  });

  const login = (user: UserIdentity, token: string, privateKey: string) => {
    sessionStorage.setItem("smx_user", JSON.stringify(user));
    sessionStorage.setItem("smx_token", token);
    sessionStorage.setItem("smx_pk", privateKey);

    setAuthState({
      isAuthenticated: true,
      user,
      token,
      privateKey,
    });
  };

  const logout = () => {
    sessionStorage.removeItem("smx_user");
    sessionStorage.removeItem("smx_token");
    sessionStorage.removeItem("smx_pk");

    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      privateKey: null,
    });
  };

  // For testing / demoing different dashboard perspectives
  const switchRolePreview = (role: UserRole) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, role };
      sessionStorage.setItem("smx_user", JSON.stringify(updatedUser));
      setAuthState((prev) => ({ ...prev, user: updatedUser }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, switchRolePreview }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
