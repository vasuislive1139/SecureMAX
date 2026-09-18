import React from "react";
import { ShieldCheck, LogOut, Key, UserCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { StatusBadge } from "./StatusBadge";
import { formatDID } from "../utils/formatters";

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { isAuthenticated, user, logout, switchRolePreview } = useAuth();

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(isAuthenticated ? "dashboard" : "login")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                SecureMAX
              </span>
              <span className="block text-[10px] text-emerald-400 font-mono tracking-wider uppercase">
                Zero-Trust DID & Asset Vault
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => onNavigate("login")}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                    currentPage === "login"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-emerald-400" />
                    Crypto Login
                  </span>
                </button>
                <button
                  onClick={() => onNavigate("register")}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                    currentPage === "register"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    Register / KYC
                  </span>
                </button>
              </>
            ) : (
              <>
                {/* Active user details */}
                <div className="hidden md:flex items-center gap-3 mr-4 pl-4 border-l border-slate-800">
                  <div className="text-right">
                    <div className="text-xs font-mono text-slate-300">{formatDID(user?.did || "")}</div>
                    <div className="text-[10px] text-slate-500">No MetaMask · WebCrypto Auth</div>
                  </div>
                  <StatusBadge status={user?.role || "USER"} size="sm" />
                </div>

                {/* Role Switcher for Demonstration */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                  {(["USER", "MANAGER", "ADMIN", "AUDITOR"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRolePreview(r);
                        onNavigate(r.toLowerCase() === "user" ? "dashboard" : `${r.toLowerCase()}-dashboard`);
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                        user?.role === r
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-2"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
