import React, { useState, useEffect } from "react";
import { fetchAllAssets } from "../services/assets/assetService";
import { getAllMockUsers } from "../services/auth/authService";
import { AssetRecord, UserIdentity } from "../types";
import { Copy, Shield, Key, Lock, Unlock, AlertTriangle, Check, Clock, ChevronRight } from "lucide-react";

export const AdminDashboardPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [users, setUsers] = useState<UserIdentity[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const allAssets = await fetchAllAssets();
      setAssets(allAssets);
      setUsers(getAllMockUsers());
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8 font-sans">
      
      {/* Top 4 Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#080c16]/80 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Identities</h3>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-light text-white tracking-tight">{users.length}</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">1 Suspended</span>
          </div>
        </div>

        <div className="bg-[#080c16]/80 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Assets</h3>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-light text-white tracking-tight">{assets.length}</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">AES-256-GCM</span>
          </div>
        </div>

        <div className="bg-[#080c16]/80 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <h3 className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest mb-1">Requests</h3>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-light text-amber-400 tracking-tight">2</span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Pending</span>
          </div>
        </div>

        <div className="bg-[#080c16]/80 backdrop-blur-sm border border-rose-500/20 rounded-2xl p-6 shadow-[0_0_15px_rgba(243,64,105,0.05)]">
          <h3 className="text-[10px] text-rose-500/80 font-bold uppercase tracking-widest mb-1">Incidents</h3>
          <div className="flex items-end justify-between">
            <span className="text-5xl font-light text-rose-400 tracking-tight">2</span>
            <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Critical</span>
          </div>
        </div>
      </div>

      {/* Security Pipeline */}
      <div className="bg-[#080c16]/50 border border-slate-800/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 group relative cursor-help">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-3 h-3" /></div>
          <span className="text-[11px] font-bold tracking-widest text-cyan-400">IDENTITY</span>
        </div>
        <div className="h-px bg-slate-800/80 flex-1 mx-4"></div>
        <div className="flex items-center gap-2 group relative cursor-help">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-3 h-3" /></div>
          <span className="text-[11px] font-bold tracking-widest text-cyan-400">RBAC</span>
        </div>
        <div className="h-px bg-slate-800/80 flex-1 mx-4"></div>
        <div className="flex items-center gap-2 group relative cursor-help">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-3 h-3" /></div>
          <span className="text-[11px] font-bold tracking-widest text-cyan-400">ASSET</span>
        </div>
        <div className="h-px bg-slate-800/80 flex-1 mx-4"></div>
        <div className="flex items-center gap-2 group relative cursor-help">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-3 h-3" /></div>
          <span className="text-[11px] font-bold tracking-widest text-cyan-400">KEY</span>
        </div>
        <div className="h-px bg-slate-800/80 flex-1 mx-4"></div>
        <div className="flex items-center gap-2 group relative cursor-help">
          <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse"><AlertTriangle className="w-3 h-3" /></div>
          <span className="text-[11px] font-bold tracking-widest text-rose-400">SENTINEL (2)</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Access Control */}
          <div className="bg-[#080c16] border border-slate-800/60 rounded-xl overflow-hidden shadow-md transition-all">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/60">
              <h3 className="text-[13px] font-bold text-white tracking-wide">ACCESS CONTROL</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Requests */}
              <div className="flex items-center justify-between group">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded bg-slate-800/50 flex items-center justify-center text-slate-400 mt-1"><Lock className="w-4 h-4" /></div>
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-1">Arjun Verma <span className="text-slate-500 font-normal mx-1">→</span> SMX-FIN-002</div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">ENGINEER</span>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700">RESTRICTED</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Requested 25m ago</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">TTL <span className="text-white">30m</span></div>
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold rounded-md transition shadow-[0_0_8px_rgba(6,182,212,0.1)]">APPROVE</button>
                    <button className="px-4 py-1.5 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-[10px] font-bold transition">DENY</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded bg-slate-800/50 flex items-center justify-center text-slate-400 mt-1"><Lock className="w-4 h-4" /></div>
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-1">Neha Iyer <span className="text-slate-500 font-normal mx-1">→</span> SMX-HR-001</div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">AUDITOR</span>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700">CONFIDENTIAL</span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3"/> Requested 8m ago</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">TTL <span className="text-white">15m</span></div>
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold rounded-md transition shadow-[0_0_8px_rgba(6,182,212,0.1)]">APPROVE</button>
                    <button className="px-4 py-1.5 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md text-[10px] font-bold transition">DENY</button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800/60">
                <h4 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">LIVE GRANTS</h4>
                
                <div className="flex items-center justify-between bg-slate-900/30 p-3 rounded-lg border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Unlock className="w-3 h-3" /></div>
                    <div>
                      <div className="text-[12px] font-semibold text-white">Arjun Verma <span className="text-slate-500 font-normal mx-1">→</span> SMX-ENG-003</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[10px] font-mono text-emerald-400">ACTIVE</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Exp 21:14</span>
                    <button className="px-3 py-1 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 rounded text-[9px] font-bold transition">REVOKE</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log */}
          <div className="bg-[#080c16] border border-slate-800/60 rounded-xl overflow-hidden shadow-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/60">
              <h3 className="text-[13px] font-bold text-white tracking-wide">AUDIT LOG</h3>
              <button className="px-3 py-1 bg-slate-800/50 hover:bg-slate-800 text-[9px] border border-slate-700 text-slate-300 rounded-md font-bold transition">Verify Chain</button>
            </div>
            <div className="p-6 font-mono text-[11px] relative">
              {/* Vertical line */}
              <div className="absolute left-[70px] top-8 bottom-8 w-px bg-slate-800/80"></div>
              
              <div className="space-y-5 relative z-10">
                <div className="flex items-center gap-6 group">
                  <div className="w-10 text-slate-500 text-right">14:02</div>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded border border-slate-800/30">
                    <span className="text-cyan-400 font-bold">BREAK_GLASS_GRANTED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x46a199...fb1</span>
                      <Copy className="w-3 h-3 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 group">
                  <div className="w-10 text-slate-500 text-right">13:27</div>
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_5px_#fb7185]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded border border-slate-800/30">
                    <span className="text-rose-400 font-bold">ACCESS_DENIED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x8c1f04...916</span>
                      <Copy className="w-3 h-3 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 group">
                  <div className="w-10 text-slate-500 text-right">13:26</div>
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#fbbf24]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded border border-slate-800/30">
                    <span className="text-amber-400 font-bold">KEY_ACCESS_DENIED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x2ad7ee...e02</span>
                      <Copy className="w-3 h-3 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Sentinel Box - MOST IMPORTANT */}
          <div className="bg-[#080c16] border border-slate-800/60 rounded-xl overflow-hidden shadow-lg relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/60">
              <h3 className="text-[13px] font-bold text-white tracking-wide">SENTINEL</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[9px] font-mono font-bold text-emerald-400">MONITORING</span>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Security Checks */}
              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex justify-between items-center text-slate-400 bg-slate-900/30 px-3 py-1.5 rounded">
                  <span className="flex items-center gap-2"><Check className="w-3 h-3 text-slate-600"/> Unauthorized access</span>
                  <span className="text-slate-500">BLOCKED</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 bg-slate-900/30 px-3 py-1.5 rounded">
                  <span className="flex items-center gap-2"><Check className="w-3 h-3 text-slate-600"/> Expired key</span>
                  <span className="text-slate-500">BLOCKED</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 bg-slate-900/30 px-3 py-1.5 rounded">
                  <span className="flex items-center gap-2"><Check className="w-3 h-3 text-slate-600"/> Revoked permission</span>
                  <span className="text-slate-500">BLOCKED</span>
                </div>
              </div>

              {/* Critical Alert Sub-box */}
              <div className="border border-rose-500/30 bg-rose-500/5 p-5 rounded-xl shadow-[0_0_20px_rgba(243,64,105,0.05)]">
                <div className="flex items-center gap-2 text-rose-400 font-bold mb-3 text-[11px] tracking-widest uppercase">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]"></span> 
                  CRITICAL
                </div>
                
                <h4 className="text-white font-bold text-sm mb-1">DECRYPTION ATTEMPT</h4>
                <div className="text-[11px] font-mono text-rose-400/80 mb-4">SMX-HNY-008 <span className="mx-2 text-slate-600">|</span> UNAUTHORIZED KEY REQUEST</div>
                
                <div className="flex gap-3 font-sans">
                  <button className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2 rounded-md text-[10px] font-bold tracking-wider transition">SUSPEND</button>
                  <button className="flex-1 text-slate-300 border border-slate-700 hover:bg-slate-800 py-2 rounded-md text-[10px] font-bold tracking-wider transition">VIEW INCIDENT</button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Domain Box */}
          <div className="bg-[#080c16] border border-slate-800/60 rounded-xl overflow-hidden shadow-md">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/60">
              <h3 className="text-[13px] font-bold text-white tracking-wide">KEY DOMAIN</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Key className="w-3 h-3" /></div>
                  <div>
                    <div className="text-[12px] font-bold text-white flex items-center gap-2">
                      SMX-HR-001 <span className="text-[9px] font-mono text-emerald-400">v2 ACTIVE</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">MANAGER</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 border border-slate-700 text-slate-400 hover:text-white rounded text-[9px] font-bold transition">ROTATE</button>
                  <button className="px-2 py-1 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 rounded text-[9px] font-bold transition">REVOKE</button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-rose-500/10 flex items-center justify-center text-rose-400"><AlertTriangle className="w-3 h-3" /></div>
                  <div>
                    <div className="text-[12px] font-bold text-white flex items-center gap-2">
                      SMX-HNY-008 <span className="text-[9px] font-mono text-rose-400">DECOY</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">TRIPWIRE</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
