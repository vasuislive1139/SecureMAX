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
      { id: "auditor-dashboard", label: "Audit Log", icon: <FileSearch className="w-4 h-4" /> }
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-[#05080f] text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-[#080c16] border-r border-slate-800/60 flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Area */}
          <div className="h-14 flex items-center px-5 border-b border-slate-800/60">
            <Shield className="w-5 h-5 text-cyan-400 mr-2" />
            <span className="font-bold tracking-widest text-[13px] text-slate-100">SECURE<span className="text-cyan-400">MAX</span></span>
          </div>
          
          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-all ${
                    active 
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.1)]" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
            
            {user?.role === "ADMIN" && (
              <>
                <button className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40">
                  <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> Sentinel</div>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></span>
                </button>
                <button className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40">
                  <div className="flex items-center gap-3"><Server className="w-4 h-4" /> Infrastructure</div>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Profile Area */}
        {isAuthenticated && user && (
          <div className="p-4 border-t border-slate-800/60 bg-[#060910]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-200 truncate">{user.userId}</span>
              <span className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase">{user.role}</span>
              <span className="text-[9px] text-slate-500 truncate font-mono mt-1">{user.controllerAddress}</span>
            </div>
            <button 
              onClick={logout}
              className="mt-3 w-full py-1.5 border border-slate-700 text-slate-400 bg-slate-800/30 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 rounded-md text-[10px] uppercase tracking-wider font-bold transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#05080f]">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-slate-800/60 flex items-center justify-between px-6 bg-[#080c16]/90 backdrop-blur z-10">
          <div className="flex items-center gap-6">
            <h1 className="text-[13px] font-bold text-white tracking-widest uppercase">COMMAND CENTER</h1>
            
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/30 border border-slate-700/50">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-mono text-cyan-400 font-semibold tracking-wider">AUTHORIZATION ≠ DECRYPTION</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
              <span className="text-[9px] font-mono font-medium text-slate-400">CHAIN 1</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] font-mono text-emerald-400">ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
              <span className="text-[9px] font-mono font-medium text-slate-400">CHAIN 2</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] font-mono text-emerald-400">ONLINE</span>
            </div>
            <button className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 text-[10px] uppercase tracking-wider font-bold rounded-md transition shadow-[0_0_10px_rgba(6,182,212,0.15)]">
              RUN SENTINEL
            </button>
          </div>
        </header>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="relative z-10 max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
