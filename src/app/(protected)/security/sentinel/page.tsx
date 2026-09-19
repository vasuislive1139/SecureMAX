'use client';

import * as React from 'react';
import { Activity, Play, CheckCircle2, ShieldAlert, Server } from 'lucide-react';
import { useDemoStore } from '@/stores/useDemoStore';

export default function SentinelPage() {
  const { startSimulation, createIncident, advanceAttackPath, systemState } = useDemoStore();
  const [isRunning, setIsRunning] = React.useState(false);
  const [activeTest, setActiveTest] = React.useState<string | null>(null);

  // Exact 5 checks implemented
  const testCases = [
    { id: 'SEC-01', type: 'token_replay', name: 'Token Replay Attempt', layer: 'DOMAIN2' },
    { id: 'SEC-02', type: 'privilege_escalation', name: 'Privilege Escalation', layer: 'RBAC' },
    { id: 'SEC-03', type: 'expired_key', name: 'Expired Temporary Key', layer: 'KMS' },
    { id: 'SEC-04', type: 'unauthorized_access', name: 'Unauthorized Asset Access', layer: 'DOMAIN1' },
    { id: 'SEC-05', type: 'revoked_permission', name: 'Revoked Permission Access', layer: 'DOMAIN1' },
  ];

  const runSimulation = (tc: any) => {
    if (systemState !== 'NORMAL' && systemState !== 'RECOVERED') {
      alert("Please resolve existing incidents before running a new simulation.");
      return;
    }

    setIsRunning(true);
    setActiveTest(tc.id);

    // 1. Create Threat
    startSimulation({
      type: tc.type,
      name: tc.name,
      severity: tc.type === 'token_replay' ? 'HIGH' : 'CRITICAL',
      description: `Controlled Sandbox Simulation: Injecting ${tc.name} threat packet.`,
      blockedAt: tc.layer as any
    });

    // 2. Advance Path
    setTimeout(() => advanceAttackPath('SESSION'), 500);
    setTimeout(() => advanceAttackPath('RBAC'), 1000);
    
    setTimeout(() => {
      if (tc.layer === 'RBAC') {
        advanceAttackPath('BLOCKED');
      } else {
        advanceAttackPath('DOMAIN1');
        setTimeout(() => {
          if (tc.layer === 'DOMAIN1') {
            advanceAttackPath('BLOCKED');
          } else {
            advanceAttackPath('DOMAIN2');
            setTimeout(() => {
              if (tc.layer === 'DOMAIN2') {
                advanceAttackPath('BLOCKED');
              } else {
                advanceAttackPath('KMS');
                setTimeout(() => advanceAttackPath('BLOCKED'), 500);
              }
            }, 500);
          }
        }, 500);
      }
    }, 1500);

    // 3. Block & Incident
    setTimeout(() => {
      createIncident({
        threatId: tc.id,
        title: `Simulated ${tc.name} Blocked`,
        severity: tc.type === 'token_replay' ? 'HIGH' : 'CRITICAL',
        status: 'OPEN',
        detectionLayer: 'Sentinel Engine',
        blockedLayer: `Layer: ${tc.layer}`,
        affectedAsset: 'BEL-AVI-003',
        source: 'SANDBOX SIMULATION'
      });
      setIsRunning(false);
      setActiveTest(null);
    }, 3000);
  };

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 uppercase flex items-center gap-3">
            <Activity className="h-6 w-6 text-emerald-500" />
            Security Test Lab
          </h2>
          <p className="text-sm text-zinc-500 font-mono tracking-widest mt-1 uppercase">Controlled Security Validation</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] tracking-widest px-4 py-2 rounded uppercase mt-4 sm:mt-0 flex items-center gap-2">
           <Activity className="w-3 h-3 animate-pulse" /> 5 / 5 DETERMINISTIC CHECKS ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {testCases.map((tc) => {
          const isActive = activeTest === tc.id;
          return (
            <div key={tc.id} className={`bg-[#0a0a0c] border ${isActive ? 'border-amber-500/50' : 'border-zinc-800'} rounded-lg p-6 transition-all duration-300`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded flex items-center justify-center ${isActive ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
                     {isActive ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-mono text-[10px] text-zinc-500 tracking-widest mb-1">{tc.id}</div>
                    <div className={`text-sm font-bold uppercase tracking-widest ${isActive ? 'text-amber-500' : 'text-zinc-100'}`}>{tc.name}</div>
                  </div>
                </div>

                {isActive && (
                   <div className="flex-1 max-w-xl mx-auto flex items-center justify-between text-[10px] font-mono tracking-widest text-zinc-500">
                     <span className="text-amber-500">TEST RUNNING</span>
                     <span className="text-amber-500 animate-pulse">→ DETECTED</span>
                     <span className="text-amber-500 animate-pulse">→ BLOCKED</span>
                     <span className="text-amber-500 animate-pulse">→ INCIDENT CREATED</span>
                     <span className="text-amber-500 animate-pulse">→ AUDIT RECORDED</span>
                   </div>
                )}

                <button 
                  type="button"
                  disabled={isRunning}
                  onClick={() => runSimulation(tc)}
                  className={`font-mono text-xs tracking-widest uppercase px-6 py-3 rounded flex items-center gap-2 transition-colors cursor-pointer select-none touch-manipulation active:opacity-90 ${isActive ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-wait' : 'bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed'}`}
                >
                  {isActive ? (
                     <><Activity className="w-4 h-4 animate-spin" /> EXECUTING...</>
                  ) : (
                     <><Play className="w-4 h-4" /> RUN TEST</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
