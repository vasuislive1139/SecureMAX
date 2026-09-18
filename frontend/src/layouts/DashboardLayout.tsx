import React from "react";
import { Navbar } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { User, Shield, Wrench, FileSearch, Package } from "lucide-react";

interface DashboardLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    { id: "dashboard", label: "My Assets", icon: <Package className="w-4 h-4" /> },
    ...(user?.role === "ADMIN"
      ? [{ id: "admin-dashboard", label: "Admin Vault", icon: <Shield className="w-4 h-4" /> }]
      : []),
    ...(user?.role === "MANAGER" || user?.role === "ADMIN"
      ? [{ id: "manager-dashboard", label: "Manager Vault", icon: <Wrench className="w-4 h-4" /> }]
      : []),
    ...(user?.role === "AUDITOR" || user?.role === "ADMIN"
      ? [{ id: "auditor-dashboard", label: "Audit Trail", icon: <FileSearch className="w-4 h-4" /> }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar currentPage={currentPage} onNavigate={onNavigate} />

      {isAuthenticated && (
        <div className="border-b border-slate-900 bg-slate-950/40 px-4 sm:px-8">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition whitespace-nowrap ${
                  currentPage === item.id
                    ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        SecureMAX Academic Prototype · Smart India Hackathon · Zero-Trust DID & RBAC Platform
      </footer>
    </div>
  );
};
