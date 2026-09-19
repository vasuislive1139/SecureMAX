import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Shield, LayoutDashboard, Key, Users, FileSearch, Server, AlertTriangle, Activity, Radar } from "lucide-react";

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
  const [hoveredChain, setHoveredChain] = useState<1 | 2 | null>(null);

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
      <aside className="w-56 bg-[#080c16]/80 backdrop-blur-md border-r border-slate-800/60 flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Area */}
          <div className="h-14 flex items-center px-5 border-b border-slate-800/60">
            <div className="relative mr-2">
              <Shield className="w-5 h-5 text-cyan-400 relative z-10" />
              <div className="absolute inset-0 rounded-full status-dot-pulse border border-cyan-400/50"></div>
            </div>
            <span className="font-bold tracking-widest text-[13px] text-slate-100">
              SECURE<span className="text-cyan-400">MAX</span>
            </span>
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
                    ? "glass-card text-cyan-400 border-l-2 border-l-cyan-400 border-t-0 border-r-0 border-b-0 shadow-[0_0_8px_rgba(6,182,212,0.1)] bg-cyan-500/10" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
            
            {user?.role === "ADMIN" && (
              <>
                <button className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent">
                  <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> Sentinel</div>
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30">2</span>
                </button>
                <button className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent">
                  <div className="flex items-center gap-3"><Server className="w-4 h-4" /> Infrastructure</div>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Profile Area */}
        {isAuthenticated && user && (
          <div className="p-4 border-t border-slate-800/60 bg-[#060910]/80">
            <div className="flex flex-col gap-0.5 mb-3">
              <span className="text-xs font-semibold text-slate-200 truncate">{user.userId}</span>
              <span className="text-[9px] font-bold text-cyan-400 tracking-wider uppercase">{user.role}</span>
              <span className="text-[9px] text-slate-500 truncate font-mono mt-1" title={user.controllerAddress}>
                {user.controllerAddress ? `${user.controllerAddress.substring(0, 8)}...${user.controllerAddress.substring(user.controllerAddress.length - 6)}` : ''}
              </span>
            </div>
            <button 
              onClick={logout}
              className="w-full btn-3d py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-300 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#05080f] bg-radial bg-grid">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-slate-800/60 flex items-center justify-between px-6 bg-[#080c16]/90 backdrop-blur z-20">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-[13px] font-bold text-white tracking-widest uppercase">COMMAND CENTER</h1>
              <span className="text-[8px] text-cyan-400 tracking-widest uppercase opacity-80">SECURITY OPERATIONS</span>
            </div>
            
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full glass-card border border-slate-700/50">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-mono text-cyan-400 font-semibold tracking-wider">AUTHORIZATION ≠ DECRYPTION</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Chain 1 */}
            <div 
              className="relative"
              onMouseEnter={() => setHoveredChain(1)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <div className="flex items-center gap-1.5 px-3 py-1 glass-card rounded-full border border-slate-800 cursor-help">
                <span className="text-[9px] font-mono font-medium text-slate-400">CHAIN 1</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]"></span>
              </div>
              {hoveredChain === 1 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 glass-card border border-slate-700 rounded text-[9px] font-mono text-cyan-400 whitespace-nowrap z-50 animate-fade-in-up">
                  IDENTITY + RBAC + ASSET AUTHORIZATION
                </div>
              )}
            </div>

            {/* Chain 2 */}
            <div 
              className="relative"
              onMouseEnter={() => setHoveredChain(2)}
              onMouseLeave={() => setHoveredChain(null)}
            >
              <div className="flex items-center gap-1.5 px-3 py-1 glass-card rounded-full border border-slate-800 cursor-help">
                <span className="text-[9px] font-mono font-medium text-slate-400">CHAIN 2</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]"></span>
              </div>
              {hoveredChain === 2 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 glass-card border border-slate-700 rounded text-[9px] font-mono text-cyan-400 whitespace-nowrap z-50 animate-fade-in-up">
                  KEY POLICY + KMS + DECRYPTION
                </div>
              )}
            </div>

            <button className="btn-3d-cyan px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-md">
              RUN SENTINEL
            </button>
          </div>
        </header>

        {/* Content Scroll */}
        <div className="flex-1 overflow-y-auto p-6 relative z-10">
          <div className="relative max-w-6xl mx-auto">
            <div key={currentPage} className="animate-fade-in-up">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
