'use client';

import * as React from 'react';
import { Key, CheckCircle, XCircle, Clock, ShieldCheck, Sparkles, Loader2, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchAllAccessRequestsAction, approveAccessRequestAction } from '@/app/actions/accessRequests';
import { StoredAccessRequest } from '@/lib/auth/deviceStore';

export default function AccessRequestsPage() {
  const [requests, setRequests] = React.useState<StoredAccessRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [approvingId, setApprovingId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetchAllAccessRequestsAction();
      if (res.success && res.requests) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error('Failed to load access requests:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setStatusMessage(null);
    try {
      const res = await approveAccessRequestAction({ requestId: id });
      if (res.success && res.request) {
        setRequests(prev => prev.map(r => r.id === id ? res.request! : r));
        setStatusMessage(`NFT Permit Minted: ${res.request.nft_token_id}`);
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        alert(res.error || 'Failed to approve clearance');
      }
    } catch (err: any) {
      alert(err.message || 'Error approving request');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 uppercase flex items-center gap-3">
            <Key className="h-7 w-7 text-cyan-400" />
            Decryption Access Requests
          </h2>
          <p className="text-xs text-zinc-500 font-mono tracking-widest mt-1 uppercase">
            Hardware KMS Decryption Clearances &amp; On-Chain NFT Permits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 px-3 py-1 font-mono text-xs">
            {requests.filter(r => r.status === 'PENDING').length} PENDING
          </Badge>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 px-4 py-3 rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-zinc-500 text-xs font-mono flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          Loading access requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 rounded-xl border border-zinc-800 bg-[#0a0a0c] text-center text-zinc-500 text-xs font-mono">
          No access requests submitted.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {requests.map((req) => {
            const isApproved = req.status === 'APPROVED';
            const isPending = req.status === 'PENDING';

            return (
              <Card key={req.id} className="relative overflow-hidden bg-[#0a0a0c] border border-zinc-800 flex flex-col justify-between">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  isPending ? 'bg-amber-500' :
                  isApproved ? 'bg-cyan-500' : 'bg-red-500'
                }`} />
                
                <CardHeader className="pb-3 border-b border-zinc-900">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={`text-[10px] font-mono ${
                      isPending ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                      isApproved ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' : 
                      'border-red-500/30 text-red-400 bg-red-500/10'
                    }`}>
                      {isPending && <Clock className="h-3 w-3 mr-1" />}
                      {isApproved && <CheckCircle className="h-3 w-3 mr-1" />}
                      {req.status}
                    </Badge>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-zinc-100 mt-2">
                    {req.asset_name || req.asset_id || 'System Asset Access'}
                  </CardTitle>
                  <CardDescription className="text-xs font-mono text-zinc-500 mt-0.5">
                    CODE: {req.asset_code || req.asset_id || req.id}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-xs font-mono flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Requester Identity:</div>
                      <div className="text-zinc-200 font-bold">{req.user_name || req.user_email || 'Authorized User'}</div>
                      <div className="text-[10px] text-cyan-400">ROLE: {req.role || 'USER'} {req.user_email ? `(${req.user_email})` : ''}</div>
                    </div>

                    <div className="bg-zinc-900/60 rounded-lg p-3 text-zinc-300 border border-zinc-800/80 leading-relaxed text-[11px]">
                      <span className="text-zinc-500 text-[10px] block mb-1 uppercase font-bold">Purpose / Justification:</span>
                      &ldquo;{req.reason}&rdquo;
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    {isPending && (
                      <Button 
                        disabled={approvingId === req.id}
                        onClick={() => handleApprove(req.id)}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs" 
                        size="sm"
                      >
                        {approvingId === req.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Minting NFT Permit...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                            Approve &amp; Mint NFT Permit
                          </>
                        )}
                      </Button>
                    )}
                    
                    {isApproved && (
                      <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[10px] flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>AUTHORIZED ON-CHAIN</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          PERMIT: <span className="text-emerald-400 font-bold">{req.nft_token_id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
