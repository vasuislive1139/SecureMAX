'use client';

import * as React from 'react';
import { Key, CheckCircle, XCircle, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AccessReq {
  id: string;
  assetCode: string;
  assetName: string;
  requester: string;
  requesterRole: string;
  purpose: string;
  status: 'PENDING' | 'AUTHORIZED' | 'DENIED';
  date: string;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = React.useState<AccessReq[]>([
    { 
      id: 'req_001', 
      assetCode: 'SMX-ALPHA-001', 
      assetName: 'Project Alpha (Core Defense Spec)',
      requester: 'Vasu (usr_vasu_002)', 
      requesterRole: 'USER',
      purpose: 'Tactical comms integration review on Enrolled Laptop A', 
      status: 'AUTHORIZED', 
      date: '15 mins ago' 
    },
    { 
      id: 'req_002', 
      assetCode: 'SMX-FIN-002', 
      assetName: 'Financial Audit Report Q3',
      requester: 'Auditor (usr_auditor_003)', 
      requesterRole: 'AUDITOR',
      purpose: 'Statutory compliance verification and expenditure review', 
      status: 'PENDING', 
      date: '45 mins ago' 
    },
    { 
      id: 'req_003', 
      assetCode: 'SMX-AVN-003', 
      assetName: 'Avionics Radar Interface Specs',
      requester: 'External Contractor', 
      requesterRole: 'UNREGISTERED',
      purpose: 'Unauthorized network probe attempt', 
      status: 'DENIED', 
      date: '2 hours ago' 
    },
  ]);

  const handleStatusChange = (id: string, newStatus: 'AUTHORIZED' | 'DENIED') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
  };

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-100 uppercase flex items-center gap-3">
          <Key className="h-7 w-7 text-cyan-400" />
          Decryption Access Requests
        </h2>
        <p className="text-xs text-zinc-500 font-mono tracking-widest mt-1 uppercase">
          Hardware KMS Decryption Clearances &amp; Authorization Pipeline
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {requests.map((req) => (
          <Card key={req.id} className="relative overflow-hidden bg-[#0a0a0c] border border-zinc-800">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${
              req.status === 'PENDING' ? 'bg-amber-500' :
              req.status === 'AUTHORIZED' ? 'bg-cyan-500' : 'bg-red-500'
            }`} />
            
            <CardHeader className="pb-3 border-b border-zinc-900">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className={`text-[10px] font-mono ${
                  req.status === 'PENDING' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                  req.status === 'AUTHORIZED' ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' : 
                  'border-red-500/30 text-red-400 bg-red-500/10'
                }`}>
                  {req.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                  {req.status === 'AUTHORIZED' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {req.status === 'DENIED' && <XCircle className="h-3 w-3 mr-1" />}
                  {req.status}
                </Badge>
                <span className="text-[10px] font-mono text-zinc-500">{req.date}</span>
              </div>
              <CardTitle className="text-sm font-bold text-zinc-100 mt-2">{req.assetName}</CardTitle>
              <CardDescription className="text-xs font-mono text-zinc-500 mt-0.5">
                CODE: {req.assetCode}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Requester Identity:</div>
                <div className="text-zinc-200 font-bold">{req.requester}</div>
                <div className="text-[10px] text-cyan-400">ROLE: {req.requesterRole}</div>
              </div>

              <div className="bg-zinc-900/60 rounded p-3 text-zinc-300 border border-zinc-800/80 leading-relaxed text-[11px]">
                <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Purpose:</span>
                {req.purpose}
              </div>
              
              {req.status === 'PENDING' && (
                <div className="flex space-x-2 pt-2">
                  <Button 
                    onClick={() => handleStatusChange(req.id, 'AUTHORIZED')}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs" 
                    size="sm"
                  >
                    Approve Clearance
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleStatusChange(req.id, 'DENIED')}
                    className="flex-1 border-zinc-800 text-red-400 hover:bg-red-500/10 text-xs" 
                    size="sm"
                  >
                    Deny
                  </Button>
                </div>
              )}
              
              {req.status === 'AUTHORIZED' && (
                <div className="p-2.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  KMS Clearance Active (User can decrypt in vault)
                </div>
              )}

              {req.status === 'DENIED' && (
                <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  Access Prohibited (Policy Invariant Enforced)
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
