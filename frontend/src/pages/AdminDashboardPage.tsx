import React, { useState, useEffect } from "react";
import { fetchAllAssets } from "../services/assets/assetService";
import { getAllMockUsers } from "../services/auth/authService";
import { AssetRecord, UserIdentity } from "../types";
import { 
  Lock, Unlock, Shield, Key, Users, AlertTriangle, Check, 
  Clock, Copy, ChevronRight, Link, Radar, Database, Fingerprint, Activity, Eye 
} from "lucide-react";

// Hook/Component for Animated Counter
const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const end = value;
    if (end <= 0) {
      setCount(end);
      return;
    }

    const duration = 500;
    const incrementTime = 30;
    const steps = Math.ceil(duration / incrementTime);
    const stepValue = end / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value]);

  return <>{count}</>;
};

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
    <div className="space-y-8 font-sans pb-10">
      
      {/* 1. METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0s' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Identities</h3>
              <div className="text-4xl font-bold text-white mb-1"><AnimatedCounter value={users.length} /></div>
              <div className="text-xs text-slate-500">Verified</div>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400"><Users className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-[10px] font-mono text-cyan-400 uppercase">System Healthy</span>
          </div>
        </div>

        <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Assets</h3>
              <div className="text-4xl font-bold text-white mb-1"><AnimatedCounter value={assets.length} /></div>
              <div className="text-xs text-slate-500">AES-256-GCM</div>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400"><Lock className="w-6 h-6" /></div>
          </div>
        </div>

        <div className="glass-card p-6 animate-fade-in-up border border-amber-500/20" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Requests</h3>
              <div className="text-4xl font-bold text-amber-400 mb-1"><AnimatedCounter value={2} /></div>
              <div className="text-xs text-slate-500">Pending</div>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400"><Key className="w-6 h-6" /></div>
          </div>
        </div>

        <div className="glass-card p-6 animate-fade-in-up border border-rose-500/20" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Incidents</h3>
              <div className="text-4xl font-bold text-rose-400 mb-1"><AnimatedCounter value={2} /></div>
              <div className="text-xs text-slate-500">Critical</div>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-lg text-rose-400"><AlertTriangle className="w-6 h-6" /></div>
          </div>
        </div>
      </div>

      {/* 2. SECURITY PIPELINE */}
      <div className="glass-card p-6 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-3 relative cursor-help" title="Identity Verified">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-4 h-4" /></div>
          <span className="text-xs font-bold tracking-widest text-cyan-400">IDENTITY</span>
        </div>
        <div className="security-pipeline-line flex-1 h-px bg-slate-700 mx-4"></div>
        <div className="flex items-center gap-3 relative cursor-help" title="Role-Based Access Control">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-4 h-4" /></div>
          <span className="text-xs font-bold tracking-widest text-cyan-400">RBAC</span>
        </div>
        <div className="security-pipeline-line flex-1 h-px bg-slate-700 mx-4"></div>
        <div className="flex items-center gap-3 relative cursor-help" title="Asset Access Checked">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-4 h-4" /></div>
          <span className="text-xs font-bold tracking-widest text-cyan-400">ASSET</span>
        </div>
        <div className="security-pipeline-line flex-1 h-px bg-slate-700 mx-4"></div>
        <div className="flex items-center gap-3 relative cursor-help" title="Key Policy Checked">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><Check className="w-4 h-4" /></div>
          <span className="text-xs font-bold tracking-widest text-cyan-400">KEY</span>
        </div>
        <div className="security-pipeline-line flex-1 h-px bg-slate-700 mx-4"></div>
        <div className="flex items-center gap-3 relative cursor-help" title="Sentinel Active Monitoring">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse"><AlertTriangle className="w-4 h-4" /></div>
          <span className="text-xs font-bold tracking-widest text-rose-400">SENTINEL (2)</span>
        </div>
      </div>

      {/* 3. ARCHITECTURE VISUALIZATION */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="glass-card flex-1 p-6 border-t-2 border-t-cyan-500">
          <div className="text-xs font-bold text-slate-400 mb-4 tracking-widest uppercase">Chain 1: Application Access</div>
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
            <span>IDENTITY</span> <ChevronRight className="w-3 h-3 text-slate-600"/> 
            <span>RBAC</span> <ChevronRight className="w-3 h-3 text-slate-600"/> 
            <span>ASSET</span> <ChevronRight className="w-3 h-3 text-slate-600"/> 
            <span className="px-2 py-1 bg-cyan-500/20 rounded">AUTHORIZED</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-4">
          <Shield className="w-8 h-8 text-slate-400 mb-1" />
          <span className="text-2xl font-bold text-white">≠</span>
        </div>

        <div className="glass-card flex-1 p-6 border-t-2 border-t-violet-500">
          <div className="text-xs font-bold text-slate-400 mb-4 tracking-widest uppercase">Chain 2: Cryptographic Access</div>
          <div className="flex items-center justify-between text-xs font-mono text-violet-400">
            <span>KEY POLICY</span> <ChevronRight className="w-3 h-3 text-slate-600"/> 
            <span>KMS</span> <ChevronRight className="w-3 h-3 text-slate-600"/> 
            <span className="px-2 py-1 bg-violet-500/20 rounded">DECRYPTION</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left & Right Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Access Control & Audit Log */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* ACCESS CONTROL */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800/60">
              <Lock className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Access Control</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Requests */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-slate-800/50 flex items-center justify-center text-slate-400 border border-slate-700/50"><Lock className="w-5 h-5" /></div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Arjun Verma <span className="text-slate-500 mx-1">→</span> SMX-FIN-002</div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">ENGINEER</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/50 border border-slate-700">RESTRICTED</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs font-mono text-slate-400">TTL <span className="text-white">30m</span></div>
                  <div className="flex gap-2">
                    <button className="btn-3d-cyan px-4 py-1.5 text-[10px] font-bold rounded">APPROVE</button>
                    <button className="btn-3d px-4 py-1.5 text-[10px] font-bold rounded">DENY</button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-slate-800/50 flex items-center justify-center text-slate-400 border border-slate-700/50"><Lock className="w-5 h-5" /></div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">Neha Iyer <span className="text-slate-500 mx-1">→</span> SMX-HR-001</div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">AUDITOR</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/50 border border-slate-700">CONFIDENTIAL</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs font-mono text-slate-400">TTL <span className="text-white">15m</span></div>
                  <div className="flex gap-2">
                    <button className="btn-3d-cyan px-4 py-1.5 text-[10px] font-bold rounded">APPROVE</button>
                    <button className="btn-3d px-4 py-1.5 text-[10px] font-bold rounded">DENY</button>
                  </div>
                </div>
              </div>

              {/* Live Grants */}
              <div className="pt-6 border-t border-slate-800/60">
                <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Live Grants</h4>
                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Unlock className="w-4 h-4" /></div>
                    <div className="text-sm font-semibold text-white">Arjun Verma <span className="text-slate-500 mx-1">→</span> SMX-ENG-003</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Exp 21:14</span>
                    <button className="btn-3d-danger px-4 py-1.5 text-[10px] font-bold rounded">REVOKE</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AUDIT LOG */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Audit Log</h3>
              </div>
              <button className="btn-3d px-3 py-1.5 text-[10px] font-bold rounded">Verify Chain</button>
            </div>
            
            <div className="p-6 relative text-xs font-mono">
              <div className="absolute left-[72px] top-6 bottom-6 w-px bg-slate-700 shadow-[0_0_8px_rgba(148,163,184,0.5)]"></div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-12 text-slate-500 text-right">14:02</div>
                  <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800/50">
                    <span className="text-cyan-400 font-bold">BREAK_GLASS_GRANTED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x46a199...fb1</span>
                      <Copy className="w-4 h-4 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-12 text-slate-500 text-right">13:27</div>
                  <div className="w-3 h-3 rounded-full bg-rose-400 shadow-[0_0_10px_#fb7185]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800/50">
                    <span className="text-rose-400 font-bold">ACCESS_DENIED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x8c1f04...916</span>
                      <Copy className="w-4 h-4 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-12 text-slate-500 text-right">13:26</div>
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800/50">
                    <span className="text-amber-400 font-bold">KEY_ACCESS_DENIED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x2ad7ee...e02</span>
                      <Copy className="w-4 h-4 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-12 text-slate-500 text-right">13:20</div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"></div>
                  <div className="flex-1 flex justify-between items-center bg-slate-900/50 p-3 rounded border border-slate-800/50">
                    <span className="text-emerald-400 font-bold">DECRYPTION_COMPLETED</span>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>0x1bc3ef...a93</span>
                      <Copy className="w-4 h-4 cursor-pointer hover:text-white transition" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sentinel, Blockchain, Key Domain */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* SENTINEL PANEL */}
          <div className="glass-card-sentinel overflow-hidden border border-rose-500/30">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-rose-500/5">
              <div className="flex items-center gap-2">
                <Radar className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Sentinel</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono font-bold text-emerald-400">MONITORING</span>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-center my-4">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="radar-ring absolute inset-0 border border-emerald-500/50 rounded-full"></div>
                  <div className="absolute inset-2 border border-emerald-500/30 rounded-full"></div>
                  <Radar className="w-8 h-8 text-emerald-400" />
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-400 bg-slate-900/50 px-3 py-2 rounded">
                  <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500"/> Unauthorized access</span>
                  <span className="text-emerald-500">BLOCKED</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 bg-slate-900/50 px-3 py-2 rounded">
                  <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500"/> Expired key</span>
                  <span className="text-emerald-500">BLOCKED</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 bg-slate-900/50 px-3 py-2 rounded">
                  <span className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500"/> Revoked permission</span>
                  <span className="text-emerald-500">BLOCKED</span>
                </div>
              </div>

              <div className="glass-card border-rose-500/50 p-5 mt-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]"></span>
                  <span className="text-rose-400 font-bold text-xs tracking-widest uppercase">Critical Incident</span>
                </div>
                <h4 className="text-white font-bold text-base mb-1">DECRYPTION ATTEMPT</h4>
                <div className="text-xs font-mono text-rose-300 mb-5">SMX-HNY-008 <span className="text-slate-600 mx-2">|</span> UNAUTHORIZED KEY REQUEST</div>
                <div className="flex gap-3">
                  <button className="flex-1 btn-3d-danger py-2 text-[10px] font-bold rounded">SUSPEND</button>
                  <button className="flex-1 btn-3d py-2 text-[10px] font-bold rounded">INVESTIGATE</button>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCKCHAIN VISUALIZATION */}
          <div className="flex flex-col space-y-3">
            {[
              { id: "6,482,113", hash: "0x8fa...c91" },
              { id: "6,482,112", hash: "0x3b1...e42" },
              { id: "6,482,111", hash: "0x9c5...f88" },
            ].map((block, idx) => (
              <React.Fragment key={block.id}>
                <div className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="text-xs font-bold text-white">BLOCK #{block.id}</div>
                      <div className="text-[10px] font-mono text-slate-500">{block.hash}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-[10px] font-bold">
                    <Check className="w-3 h-3" /> VERIFIED
                  </div>
                </div>
                {idx < 2 && (
                  <div className="flex justify-center">
                    <div className="blockchain-connection w-px h-6 bg-cyan-500/50 shadow-[0_0_8px_#06b6d4]"></div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* KEY DOMAIN */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800/60">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Key Domain</h3>
            </div>
            <div className="p-6 space-y-5">
              
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Key className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm font-bold text-white">SMX-HR-001</div>
                      <div className="text-xs font-mono text-slate-500">MANAGER role</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-3d px-3 py-1 text-[10px] font-bold rounded">ROTATE</button>
                    <button className="btn-3d-danger px-3 py-1 text-[10px] font-bold rounded">REVOKE</button>
                  </div>
                </div>
                
                <div className="relative pt-2">
                  <div className="flex justify-between text-[9px] font-mono font-bold text-slate-500 mb-1">
                    <span>GENERATED</span>
                    <span className="text-emerald-400">ACTIVE</span>
                    <span>ROTATED</span>
                    <span>REVOKED</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 w-1/3"></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-lg border border-rose-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <span className="text-[9px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">TRIPWIRE</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-rose-500/10 flex items-center justify-center text-rose-400"><AlertTriangle className="w-4 h-4" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">SMX-HNY-008</div>
                    <div className="text-xs font-mono text-rose-400">DECOY STATUS</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
