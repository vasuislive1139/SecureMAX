import React from "react";
import { useAuth } from "../hooks/useAuth";
import { Shield, LayoutDashboard, Key, Users, Activity, FileSearch, Server, AlertTriangle } from "lucide-react";

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
  const { isAuthenticated, user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "My Assets", icon: <LayoutDashboard className="w-4 h-4" /> },
    ...(user?.role === "ADMIN" ? [
      { id: "admin-dashboard", label: "Command Center", icon: <Shield className="w-4 h-4" /> },
      { id: "identities", label: "Identities", icon: <Users className="w-4 h-4" /> },
    ] : []),
    ...(user?.role === "MANAGER" || user?.role === "ADMIN" ? [
      { id: "manager-dashboard", label: "Assets & Grants", icon: <Key className="w-4 h-4" /> }
    ] : []),
    ...(user?.role === "AUDITOR" || user?.role === "ADMIN" ? [
      { id: "auditor-dashboard", label: "Audit & Forensics", icon: <FileSearch className="w-4 h-4" /> }
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-[#06090e] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0f18] border-r border-slate-800/80 flex flex-col justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)] z-20">
        <div>
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800/80">
            <Shield className="w-5 h-5 text-cyan-400 mr-3" />
            <span className="font-bold tracking-widest text-sm text-slate-100">SECURE<span className="text-cyan-400">MAX</span></span>
          </div>
          
          {/* Nav Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-all ${
                    active 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
            
            {user?.role === "ADMIN" && (
              <>
                <button className="w-full flex items-center justify-between px-3 py-2.5 mt-2 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50">
                  <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> Sentinel</div>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></span>
                </button>
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50">
                  <div className="flex items-center gap-3"><Server className="w-4 h-4" /> Infrastructure</div>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Profile Area */}
        {isAuthenticated && user && (
          <div className="p-4 border-t border-slate-800/80 bg-[#080d14]">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-200 truncate">{user.userId}</span>
              <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase">{user.role}</span>
              <span className="text-[10px] text-slate-500 truncate font-mono mt-1">{user.controllerAddress}</span>
              <span className="text-[9px] text-slate-600 truncate font-mono">{user.did}</span>
            </div>
            <button 
              onClick={logout}
              className="mt-3 w-full py-1.5 border border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded text-[10px] uppercase tracking-wider font-bold transition"
            >
              Terminate Session
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#06090e]">
        {/* Topbar */}
        <header className="h-16 shrink-0 border-b border-slate-800/80 flex items-center justify-between px-6 bg-[#0a0f18]/80 backdrop-blur z-10">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Command Center</h1>
            <p className="text-[10px] text-slate-500">Global security posture • updated live</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded bg-[#06090e] border border-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></span>
              <span className="text-[10px] font-mono text-slate-400">CHAIN-1 • blk 6,482,113</span>
            </div>
            <div className="px-3 py-1 rounded bg-[#06090e] border border-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></span>
              <span className="text-[10px] font-mono text-slate-400">CHAIN-2 • blk 6,482,113</span>
            </div>
            <button className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-900 text-xs font-bold rounded shadow-[0_0_15px_rgba(34,211,238,0.4)] transition">
              Run Sentinel scan
            </button>
          </div>
        </header>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          {/* Subtle grid background overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50 pointer-events-none"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
