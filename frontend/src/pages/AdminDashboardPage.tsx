import React, { useState, useEffect } from "react";
import { fetchAllAssets, mintAsset } from "../services/assets/assetService";
import { getAllMockUsers, updateMockUserRole } from "../services/auth/authService";
import { AssetRecord, UserIdentity, UserRole } from "../types";
import { formatAddress, formatDID } from "../utils/formatters";

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
    <div className="space-y-6">
      {/* Top 4 Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between shadow-lg">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Identities</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-white">{users.length}</span>
            <span className="text-xs text-slate-500 mb-1">1 suspended</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#111827] border border-slate-800 rounded-lg p-5 flex flex-col justify-between shadow-lg">
          <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Active Assets</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-white">{assets.length}</span>
            <span className="text-xs text-slate-500 mb-1">AES-256-GCM</span>
          </div>
        </div>

        {/* Card 3 (Yellow glow) */}
        <div className="bg-[#111827] border border-amber-500/30 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <h3 className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mb-2">Pending Requests</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-amber-400">2</span>
            <span className="text-xs text-slate-500 mb-1">oldest 25 min</span>
          </div>
        </div>

        {/* Card 4 (Red glow) */}
        <div className="bg-[#111827] border border-rose-500/30 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden shadow-[0_0_15px_rgba(243,64,105,0.1)]">
          <h3 className="text-[10px] text-rose-500/80 font-bold uppercase tracking-wider mb-2">Open Incidents</h3>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-rose-400">2</span>
            <span className="text-xs text-slate-500 mb-1">both CRITICAL</span>
          </div>
        </div>
      </div>

      {/* Sub-status text row */}
      <div className="grid grid-cols-5 gap-4 px-2 pt-2">
        <div className="text-[9px] font-bold tracking-widest text-emerald-400">IDENTITY<br/>VERIFIED</div>
        <div className="text-[9px] font-bold tracking-widest text-emerald-400">RBAC<br/>ENFORCED</div>
        <div className="text-[9px] font-bold tracking-widest text-emerald-400">ASSET REGISTRY<br/>ANCHORED</div>
        <div className="text-[9px] font-bold tracking-widest text-emerald-400">KEY DOMAIN<br/>PROTECTED</div>
        <div className="text-[9px] font-bold tracking-widest text-amber-400">SENTINEL<br/>2 OPEN ALERTS</div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Access Requests & Live Grants */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/80">
              <h3 className="text-xs font-bold text-white">Access requests & live grants</h3>
              <span className="text-[10px] text-slate-500">Approve signs on Chain-1</span>
            </div>
            <div className="p-5 space-y-5">
              {/* Request 1 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">Arjun Verma → SMX-FIN-002</div>
                  <div className="text-[10px] text-slate-400 mb-0.5">Purpose: reconcile vendor invoices for Substation 4 works</div>
                  <div className="text-[9px] font-mono text-slate-500">ENGINEER - RESTRICTED - requested 25 min ago</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">TTL <span className="px-2 py-1 bg-[#06090e] border border-slate-700 rounded">30 min</span></div>
                  <button className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#06090e] text-[10px] font-bold rounded shadow-[0_0_10px_rgba(34,211,238,0.4)] transition">Approve</button>
                  <button className="px-3 py-1.5 border border-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-bold transition">Deny</button>
                </div>
              </div>

              {/* Request 2 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">Neha Iyer → SMX-HR-001</div>
                  <div className="text-[10px] text-slate-400 mb-0.5">Purpose: statutory PF audit sample check</div>
                  <div className="text-[9px] font-mono text-slate-500">AUDITOR - CONFIDENTIAL - requested 8 min ago</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">TTL <span className="px-2 py-1 bg-[#06090e] border border-slate-700 rounded">15 min</span></div>
                  <button className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-[#06090e] text-[10px] font-bold rounded shadow-[0_0_10px_rgba(34,211,238,0.4)] transition">Approve</button>
                  <button className="px-3 py-1.5 border border-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-bold transition">Deny</button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <h4 className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-3">Live Grants</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white mb-0.5">Arjun Verma · SMX-ENG-003</div>
                    <div className="text-[9px] font-mono text-slate-500">session 1bb04bec · 10.42.7.19 · known device</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-cyan-400">expires in 21:14</span>
                    <button className="px-3 py-1.5 border border-rose-500/50 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded text-[10px] font-bold transition shadow-[0_0_10px_rgba(244,63,94,0.1)]">Revoke now</button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <div className="text-xs font-bold text-white mb-0.5">Riya Sharma · SMX-HR-001</div>
                    <div className="text-[9px] font-mono text-slate-500">key v2 · rotated 20 min ago</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-slate-500">idle</span>
                    <button className="px-3 py-1.5 border border-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-bold transition">Revoke</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Chain Log */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden shadow-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/80">
              <h3 className="text-xs font-bold text-white">Audit chain</h3>
              <button className="px-3 py-1 text-[10px] border border-slate-700 text-slate-300 rounded font-bold hover:bg-slate-800">Verify chain</button>
            </div>
            <div className="p-5 font-mono text-[10px] space-y-3">
              <div className="grid grid-cols-12 gap-2 text-slate-300 items-center">
                <div className="col-span-2">14:02</div>
                <div className="col-span-3 text-white font-bold">BREAK_GLASS_GRANTED</div>
                <div className="col-span-5 text-slate-500">0x461a99e3...e0c5efb1</div>
                <div className="col-span-2 text-right text-slate-400">prev linked</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-slate-300 items-center">
                <div className="col-span-2">13:27</div>
                <div className="col-span-3 text-rose-400 font-bold">ACCESS_DENIED</div>
                <div className="col-span-5 text-slate-500">0x8c1f04ba...77d3a916</div>
                <div className="col-span-2 text-right text-slate-400">Domain 1 / RBAC</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-slate-300 items-center">
                <div className="col-span-2">13:26</div>
                <div className="col-span-3 text-rose-400 font-bold">KEY_ACCESS_DENIED</div>
                <div className="col-span-5 text-slate-500">0x2ad7ee51...b40c8e02</div>
                <div className="col-span-2 text-right text-slate-400">Domain 2 / KMS</div>
              </div>
              <div className="grid grid-cols-12 gap-2 text-slate-300 items-center">
                <div className="col-span-2">11:14</div>
                <div className="col-span-3 text-emerald-400 font-bold">DECRYPTION_COMPLETED</div>
                <div className="col-span-5 text-slate-500">0xf03bd7c2...19ae5d44</div>
                <div className="col-span-2 text-right text-slate-400">anchored</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Sentinel Box */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden shadow-lg">
             <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/80">
              <h3 className="text-xs font-bold text-white">Sentinel</h3>
              <span className="text-[9px] font-mono text-emerald-400">5 / 5 PASSED · 40 min ago</span>
            </div>
            <div className="p-5 space-y-3 text-[10px] font-mono">
              <div className="flex justify-between text-slate-400"><span>Unauthorized asset access</span><span className="text-emerald-400">blocked</span></div>
              <div className="flex justify-between text-slate-400"><span>Expired temporary key</span><span className="text-emerald-400">blocked</span></div>
              <div className="flex justify-between text-slate-400"><span>Revoked permission access</span><span className="text-emerald-400">blocked</span></div>
              <div className="flex justify-between text-slate-400"><span>Privilege escalation</span><span className="text-emerald-400">blocked</span></div>
              <div className="flex justify-between text-slate-400"><span>Token replay</span><span className="text-emerald-400">blocked</span></div>

              {/* Critical Alert Sub-box */}
              <div className="mt-5 border border-rose-500/50 bg-rose-500/10 p-4 rounded shadow-[0_0_15px_rgba(243,64,105,0.05)]">
                <div className="flex items-center gap-2 text-rose-400 font-bold mb-2 text-[11px]">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span> CRITICAL · decoy asset opened
                </div>
                <p className="text-[10px] text-slate-300 mb-4 font-sans leading-relaxed">
                  Kabir Rao attempted to decrypt SMX-HNY-008. No user has a business need for this asset. Session frozen automatically.
                </p>
                <div className="flex gap-2 font-sans">
                  <button className="flex-1 bg-rose-500/20 text-rose-400 border border-rose-500/50 py-1.5 rounded hover:bg-rose-500/30 transition">Suspend identity</button>
                  <button className="flex-1 text-slate-300 border border-slate-700 py-1.5 rounded hover:bg-slate-800 transition">Open incident</button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Lifecycle Box */}
          <div className="bg-[#111827] border border-slate-800 rounded-lg overflow-hidden shadow-lg">
            <div className="flex justify-between items-center px-5 py-3 border-b border-slate-800/80">
              <h3 className="text-xs font-bold text-white">Key lifecycle</h3>
            </div>
            <div className="p-5 space-y-4">
              
              <div>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-bold text-white">SMX-HR-001</div>
                  <div className="text-[9px] font-mono text-emerald-400 font-bold">v2 ACTIVE</div>
                </div>
                <div className="text-[9px] font-mono text-slate-500 mb-2">role-bound · MANAGER, ADMIN · rotate 30d</div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-slate-700 text-slate-300 text-[9px] font-bold rounded hover:bg-slate-800">Rotate</button>
                  <button className="px-3 py-1 border border-slate-700 text-slate-300 text-[9px] font-bold rounded hover:bg-slate-800">Revoke key</button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-bold text-white">SMX-ENG-003</div>
                  <div className="text-[9px] font-mono text-emerald-400 font-bold">v1 ACTIVE</div>
                </div>
                <div className="text-[9px] font-mono text-slate-500">time-bound · TTL 30m · session-bound</div>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs font-bold text-white">SMX-HNY-008</div>
                  <div className="text-[9px] font-mono text-rose-400 font-bold">DECOY</div>
                </div>
                <div className="text-[9px] font-mono text-slate-500">alert on any access · severity CRITICAL</div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
