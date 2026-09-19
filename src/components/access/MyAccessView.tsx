'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Clock, 
  FileText, 
  Key, 
  Laptop, 
  Smartphone, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  X, 
  Copy, 
  Check, 
  LogOut, 
  Hexagon, 
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
  Send,
  Loader2,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  submitAccessRequestAction, 
  extendLiveGrantAction, 
  revokeLiveGrantAction 
} from '@/app/actions/accessRequests';
import { useSecureMaxRealtime } from '@/hooks/useSecureMaxRealtime';

export function MyAccessView() {
  const { data: realtimeData, broadcastUpdate, refetch } = useSecureMaxRealtime(true);
  const [activeGrantId, setActiveGrantId] = React.useState<string>('grant-1');

  // Real-time countdown timer (starts at 21:14 = 1274 seconds)
  const [secondsRemaining, setSecondsRemaining] = React.useState(1274);
  const [isLocked, setIsLocked] = React.useState(false);

  // Status for SMX-FIN-002
  const [fin002Status, setFin002Status] = React.useState<'PENDING' | 'APPROVED' | 'RESTRICTED'>('PENDING');
  const [fin002NftPermit, setFin002NftPermit] = React.useState<string | null>(null);

  // React to server/broadcast updates
  React.useEffect(() => {
    if (realtimeData?.liveGrants) {
      const grant = realtimeData.liveGrants.find((g: any) => g.assetCode === 'SMX-ENG-003');
      if (grant) {
        setActiveGrantId(grant.id);
        if (grant.status === 'ACTIVE') {
          setIsLocked(false);
          if (typeof grant.remainingSeconds === 'number') {
            setSecondsRemaining(grant.remainingSeconds);
          }
        } else if (grant.status === 'REVOKED' || grant.status === 'EXPIRED') {
          setIsLocked(true);
          setSecondsRemaining(0);
        }
      }

      // Check if SMX-FIN-002 was approved into a live grant
      const finGrant = realtimeData.liveGrants.find((g: any) => g.assetCode === 'SMX-FIN-002');
      if (finGrant && finGrant.status === 'ACTIVE') {
        setFin002Status('APPROVED');
      }
    }

    if (realtimeData?.pendingRequests) {
      const hasPendingFin = realtimeData.pendingRequests.some((r: any) => r.assetCode === 'SMX-FIN-002');
      if (hasPendingFin) {
        setFin002Status('PENDING');
      }
    }
  }, [realtimeData]);

  React.useEffect(() => {
    if (isLocked) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setIsLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked]);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Device verification state (Mobile banner from Page 3)
  const [deviceVerified, setDeviceVerified] = React.useState(false);
  const [verifyingDevice, setVerifyingDevice] = React.useState(false);

  // Extend time
  const handleExtend = async () => {
    setSecondsRemaining(prev => prev + 15 * 60);
    setIsLocked(false);
    try {
      await extendLiveGrantAction({ grantId: activeGrantId, additionalMinutes: 15 });
      broadcastUpdate('GRANT_EXTENDED', { grantId: activeGrantId, assetCode: 'SMX-ENG-003' });
    } catch (err) {
      console.error(err);
      refetch();
    }
  };

  // Lock now
  const handleLockNow = async () => {
    setIsLocked(true);
    setSecondsRemaining(0);
    try {
      await revokeLiveGrantAction({ grantId: activeGrantId });
      broadcastUpdate('GRANT_REVOKED', { grantId: activeGrantId, assetCode: 'SMX-ENG-003' });
    } catch (err) {
      console.error(err);
      refetch();
    }
  };

  // Preview modals
  const [previewScada, setPreviewScada] = React.useState(false);
  const [decryptHandbook, setDecryptHandbook] = React.useState(false);
  const [decryptFin002, setDecryptFin002] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);
  const [showGuardiansModal, setShowGuardiansModal] = React.useState(false);
  const [showRequestModal, setShowRequestModal] = React.useState(false);

  // Request form state
  const [requestAsset, setRequestAsset] = React.useState('SMX-FIN-002');
  const [requestPurpose, setRequestPurpose] = React.useState('Vendor invoice reconciliation');
  const [requestSubmitted, setRequestSubmitted] = React.useState(false);
  const [submittingRequest, setSubmittingRequest] = React.useState(false);

  const handleSubmitAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    setRequestSubmitted(true);
    setFin002Status('PENDING');

    try {
      await submitAccessRequestAction({
        assetCode: requestAsset,
        reason: requestPurpose,
        requestType: 'ASSET_ACCESS',
        ttlMinutes: 30,
      });
      broadcastUpdate('REQUEST_SUBMITTED', { assetCode: requestAsset, reason: requestPurpose });
    } catch (err) {
      console.error('Failed to submit access request:', err);
      refetch();
    } finally {
      setSubmittingRequest(false);
      setTimeout(() => {
        setRequestSubmitted(false);
        setShowRequestModal(false);
      }, 2500);
    }
  };

  const handleSignVerifyDevice = () => {
    setVerifyingDevice(true);
    setTimeout(() => {
      setVerifyingDevice(false);
      setDeviceVerified(true);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen bg-[#070709] text-zinc-100 font-sans selection:bg-emerald-500/30">
      
      {/* ---------------------------------------------------- */}
      {/* LEFT SIDEBAR (PAGE 2 DESKTOP EXACT LAYOUT)           */}
      {/* ---------------------------------------------------- */}
      <aside className="w-64 shrink-0 border-r border-zinc-800/80 bg-[#0a0a0d] flex flex-col justify-between hidden lg:flex">
        <div className="p-5 space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Hexagon className="w-6 h-6 text-emerald-400" />
            <span className="text-sm font-bold tracking-widest uppercase text-white">SECUREMAX</span>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 font-mono text-xs">
            <Link 
              href="/access"
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-400"
            >
              <span>My Access</span>
            </Link>

            <Link 
              href="/assets"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors"
            >
              <span>Asset Registry</span>
            </Link>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors cursor-pointer" onClick={() => setShowRequestModal(true)}>
              <span>My Requests</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/40 font-bold">1</span>
            </div>

            <Link 
              href="/devices"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors"
            >
              <span>My Devices</span>
            </Link>

            <Link 
              href="/audit"
              className="flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors"
            >
              <span>My Activity</span>
            </Link>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors cursor-pointer" onClick={() => setShowQrModal(true)}>
              <span>My Identity</span>
            </div>
          </nav>
        </div>

        {/* Bottom User Card */}
        <div className="p-4 border-t border-zinc-800/80 bg-black/40 font-mono text-xs space-y-2">
          <div>
            <div className="font-bold text-zinc-200">Arjun Verma</div>
            <div className="text-[10px] text-cyan-400 font-bold uppercase">ENGINEER · GRID OPS</div>
            <div className="text-[10px] text-zinc-500 truncate mt-0.5">0x3333…3333</div>
          </div>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => window.location.href = '/login'}
            className="w-full border-zinc-800 text-[11px] text-zinc-400 hover:text-red-400 hover:bg-red-950/20 h-7"
          >
            <LogOut className="w-3 h-3 mr-1.5" /> Log out everywhere
          </Button>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* MAIN VIEWPORT                                        */}
      {/* ---------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 lg:pb-8">
        
        {/* Mobile Header (Page 3) */}
        <div className="flex lg:hidden items-center justify-between border-b border-zinc-800/80 pb-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-emerald-400" />
            <span className="font-bold tracking-widest text-white">SECUREMAX</span>
          </div>
          <div className="text-zinc-400 text-[11px] bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
            0x3333…3333
          </div>
        </div>

        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">My Access</h1>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">Assets you currently hold cryptographic clearance for</p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 rounded-lg text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Trusted session · known device, known network</span>
            </div>

            <Button
              size="sm"
              onClick={() => setShowRequestModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-8 px-4"
            >
              Request access
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* MOBILE NOTICE: NEW DEVICE DETECTED (PAGE 3)          */}
        {/* ---------------------------------------------------- */}
        {!deviceVerified && (
          <div className="p-4 rounded-xl border border-amber-500/50 bg-[#161208] space-y-2.5 font-mono text-xs animate-in fade-in">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span className="text-xs uppercase">New device detected</span>
              <span className="text-[10px] text-amber-500 font-normal">Edge · Windows</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-sans">
              Sign again with your wallet to raise this session to trusted.
            </p>
            <Button
              onClick={handleSignVerifyDevice}
              disabled={verifyingDevice}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-8"
            >
              {verifyingDevice ? 'Signing with P-256 Key...' : 'Sign to verify'}
            </Button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TWO-COLUMN LAYOUT (PAGE 2)                           */}
        {/* ---------------------------------------------------- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* ================================================= */}
          {/* LEFT 2 COLUMNS: Active Decrypted Viewer & Assets   */}
          {/* ================================================= */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* ACTIVE DECRYPTED CARD (PAGE 2 & PAGE 3) */}
            <div className="rounded-2xl border border-emerald-500/40 bg-[#0a0a0d] overflow-hidden shadow-2xl space-y-4">
              
              {/* Top Banner */}
              <div className="p-3 sm:p-4 bg-emerald-950/20 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-zinc-300 text-[11px]">
                  <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>This view is decrypted in your browser and is being logged to the audit chain</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-xs">
                    {isLocked ? 'LOCKED' : `re-locks in ${formatCountdown(secondsRemaining)}`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => isLocked ? handleExtend() : handleLockNow()}
                    className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-[11px] h-6 px-2.5"
                  >
                    {isLocked ? 'Unlock now' : 'Lock now'}
                  </Button>
                </div>
              </div>

              {/* Asset Metadata Row */}
              <div className="px-5 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">SMX-ENG-003</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold uppercase">
                      HIGH
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 font-sans mt-0.5">
                    Substation 4 Relay Configuration
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">PURPOSE ON RECORD</div>
                    <div className="text-zinc-300 text-[11px]">Relay commissioning at Substation 4</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">INTEGRITY</div>
                    <div className="text-emerald-400 text-[11px] truncate max-w-[140px]">
                      hash matches Chain-1 <span className="text-zinc-500">0xf03bd7c2…</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExtend}
                    className="border-zinc-800 hover:bg-zinc-800 text-[11px] text-zinc-300 h-7"
                  >
                    Extend by 15 min
                  </Button>
                </div>
              </div>

              {/* Decrypted Code Block */}
              <div className="px-5 pb-5">
                {isLocked ? (
                  <div className="p-8 rounded-xl bg-black/60 border border-zinc-800 text-center text-zinc-500 font-mono text-xs space-y-2">
                    <Lock className="w-6 h-6 text-zinc-500 mx-auto" />
                    <div>Session clearance expired or manually locked.</div>
                    <Button size="sm" onClick={handleExtend} className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs mt-2">
                      Unlock clearance
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-black border border-zinc-800 font-mono text-xs text-emerald-300/90 leading-relaxed overflow-x-auto shadow-inner">
                    <div className="text-zinc-400 text-[11px] pb-2 mb-2 border-b border-zinc-800">
                      SUBSTATION 4 — PROTECTION RELAY CONFIGURATION<br />
                      Device: SIPROTEC 7SJ82 Feeder: F4-11kV-OUT-3
                    </div>
                    <div className="space-y-1">
                      <div>Overcurrent I&gt; 1.20 x In, 0.35 s</div>
                      <div>Overcurrent I&gt;&gt; 6.50 x In, 0.05 s</div>
                      <div>Earth fault IE&gt; 0.15 x In, 0.60 s</div>
                      <div>Auto-reclose 2 shots (0.5 s / 15 s)</div>
                      <div>Breaker fail 0.20 s backtrip to bus coupler</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MY ASSETS LIST (PAGE 2) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                  My assets
                </h2>
                <span className="text-xs text-zinc-400 font-mono">
                  3 with clearance · 5 you could request
                </span>
              </div>

              {/* Asset Item 1: SCADA Network Topology */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    <span>SMX-ENG-004</span>
                    <span>·</span>
                    <span className="text-zinc-300">SCADA Network Topology Diagram</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    RESTRICTED · read only · assigned by Aarav Mehta
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-500 font-mono">preview only</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewScada(true)}
                    className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-8 px-3"
                  >
                    Open preview
                  </Button>
                </div>
              </div>

              {/* Asset Item 2: Employee Handbook 2026 */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    <span>SMX-OPS-006</span>
                    <span>·</span>
                    <span className="text-zinc-300">Employee Handbook 2026</span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    PUBLIC · read and decrypt
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-emerald-400 font-mono">cleared</span>
                  <Button
                    size="sm"
                    onClick={() => setDecryptHandbook(true)}
                    className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold h-8 px-3"
                  >
                    Decrypt
                  </Button>
                </div>
              </div>

              {/* Dynamic Asset Notice / Decrypt: SMX-FIN-002 */}
              {fin002Status === 'APPROVED' ? (
                <div className="p-4 rounded-xl border border-emerald-500/50 bg-[#07130b] space-y-3 font-mono text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>SMX-FIN-002 Decryption Access Granted</span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                      NFT PERMIT ACTIVE
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Admin approved your request and minted an on-chain permit. AES-256-GCM decryption key derived for this active session.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setDecryptFin002(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-7 px-3 flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Open &amp; Decrypt Invoices</span>
                    </Button>
                  </div>
                </div>
              ) : fin002Status === 'PENDING' ? (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-[#120e07] space-y-3 font-mono text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                      <span>SMX-FIN-002 Decrypt Request Pending Approval</span>
                    </div>
                    <span className="text-[10px] bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded text-amber-300">
                      AWAITING ADMIN
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Your request for decrypt access is with the Administrator. Zero reload required — updates will register automatically the moment the admin approves.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRequestModal(true)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-[11px] h-7"
                    >
                      View my request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => alert('Emergency Break-Glass notification dispatched to Administrator and logged to audit chain.')}
                      className="border-amber-500/40 text-amber-400 hover:bg-amber-950/20 text-[11px] h-7"
                    >
                      Request emergency access
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0d] space-y-3 font-mono text-xs">
                  <div className="flex items-center gap-2 text-zinc-400 font-bold">
                    <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>SMX-FIN-002 (Restricted)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Decryption clearance required. Submit request to the Administrator to receive an on-chain permit.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowRequestModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs h-7"
                  >
                    Request Access
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* ================================================= */}
          {/* RIGHT COLUMN: Widgets (Page 2)                     */}
          {/* ================================================= */}
          <div className="space-y-6 font-mono text-xs">
            
            {/* Widget 1: Request Timeline */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0a0a0d] space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Request timeline
              </h3>

              <div className="space-y-3 relative pl-4 border-l border-zinc-800">
                <div className="space-y-0.5 relative">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-[21px] top-1"></span>
                  <div className="font-bold text-zinc-200">Request submitted</div>
                  <div className="text-[10px] text-zinc-500">10:58 · purpose recorded</div>
                </div>

                <div className="space-y-0.5 relative">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-[21px] top-1"></span>
                  <div className="font-bold text-zinc-200">Approved on Chain-1</div>
                  <div className="text-[10px] text-zinc-500">11:03 · 0x7e41…c9d2</div>
                </div>

                <div className="space-y-0.5 relative">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-[21px] top-1"></span>
                  <div className="font-bold text-zinc-200">Temporary key issued</div>
                  <div className="text-[10px] text-zinc-500">11:04 · TTL 30 min, session-bound</div>
                </div>

                <div className="space-y-0.5 relative">
                  <span className="w-2 h-2 rounded-full border border-zinc-600 bg-[#0a0a0d] absolute -left-[21px] top-1"></span>
                  <div className="font-bold text-zinc-400">Access expires</div>
                  <div className="text-[10px] text-zinc-500">11:34 · auto re-lock</div>
                </div>
              </div>
            </div>

            {/* Widget 2: My Devices */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0a0a0d] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                My devices
              </h3>

              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-zinc-200 text-xs">Dell Latitude · Edge · Windows</div>
                    <div className="text-[10px] text-zinc-500">this device · seen 20 min ago</div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                    trusted
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-zinc-200 text-xs">Pixel 8 · Chrome · Android</div>
                    <div className="text-[10px] text-zinc-500">seen 3 days ago</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => alert('Pixel 8 session revoked and cryptographic key de-authorized.')}
                    className="border-zinc-800 text-[10px] text-zinc-400 hover:text-red-400 h-6 px-2"
                  >
                    Not me
                  </Button>
                </div>
              </div>
            </div>

            {/* Widget 3: My Identity */}
            <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0a0a0d] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                My identity
              </h3>

              <div className="space-y-1.5 text-[11px]">
                <div className="text-zinc-400 truncate">did:securemax:0x3333…3333</div>
                <div className="text-zinc-500 truncate">wallet 0x3333…3333</div>
                <div className="text-zinc-400">role <strong className="text-zinc-200">ENGINEER</strong>, anchored Chain-1</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQrModal(true)}
                  className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] h-7"
                >
                  <QrCode className="w-3 h-3 mr-1" /> Show credential QR
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGuardiansModal(true)}
                  className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] h-7"
                >
                  <Shield className="w-3 h-3 mr-1" /> Guardians (3)
                </Button>
              </div>
            </div>

            {/* Widget 4: Report Suspicious Activity */}
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-black/40 space-y-2">
              <div className="text-zinc-400 text-[11px] font-sans">
                Something look wrong on your account?
              </div>
              <Button
                variant="outline"
                onClick={() => alert('Security Incident reported directly to SOC Team & Sentinel.')}
                className="w-full border-zinc-800 hover:bg-red-950/20 text-zinc-300 hover:text-red-400 text-xs h-8"
              >
                Report suspicious activity
              </Button>
            </div>

          </div>

        </div>

      </main>

      {/* ---------------------------------------------------- */}
      {/* MOBILE STICKY BOTTOM NAV (PAGE 3)                    */}
      {/* ---------------------------------------------------- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0a0a0d] border-t border-zinc-800 px-6 flex items-center justify-around font-mono text-xs z-40">
        <Link href="/access" className="flex flex-col items-center gap-1 text-emerald-400 font-bold">
          <Key className="w-4 h-4" />
          <span className="text-[10px]">Access</span>
        </Link>
        <button onClick={() => setShowRequestModal(true)} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
          <Send className="w-4 h-4" />
          <span className="text-[10px]">Requests</span>
        </button>
        <Link href="/audit" className="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
          <Activity className="w-4 h-4" />
          <span className="text-[10px]">Activity</span>
        </Link>
        <button onClick={() => setShowQrModal(true)} className="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
          <QrCode className="w-4 h-4" />
          <span className="text-[10px]">Identity</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* REQUEST ACCESS MODAL (PAGE 3 FORM)                   */}
      {/* ---------------------------------------------------- */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a0d] border border-zinc-800 rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase">Request access</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {requestSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div className="font-bold">Access Request Submitted!</div>
                <div className="text-[10px] text-zinc-400 font-sans">Sent to Aarav Mehta for on-chain NFT clearance approval.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAccessRequest} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Asset</label>
                  <Input 
                    value={requestAsset} 
                    onChange={e => setRequestAsset(e.target.value)} 
                    className="bg-black/60 border-zinc-800 text-zinc-200 text-xs font-mono h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Purpose (recorded on chain)</label>
                  <Input 
                    value={requestPurpose} 
                    onChange={e => setRequestPurpose(e.target.value)} 
                    className="bg-black/60 border-zinc-800 text-zinc-200 text-xs font-mono h-9"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submittingRequest}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-9 mt-2"
                >
                  {submittingRequest ? 'Submitting to Chain-1...' : 'Submit request'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DECRYPT SMX-FIN-002 MODAL */}
      {decryptFin002 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0a0a0d] border border-emerald-500/40 rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">SMX-FIN-002 · Vendor Invoices Substation 4</h3>
                <p className="text-[10px] text-emerald-400 font-sans">RESTRICTED · Server-Side KMS AES-256-GCM Decrypted for Session</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDecryptFin002(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-black border border-zinc-800 text-zinc-300 text-[11px] leading-relaxed space-y-2 font-mono">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>ON-CHAIN NFT CLEARANCE PERMIT VERIFIED</span>
              </div>
              <div className="space-y-1 text-zinc-300 pt-1">
                <div>INVOICE #INV-2026-0941: Siemens Energy AG — Substation 4 Protection &amp; SIPROTEC Relays</div>
                <div>Amount: $1,420,000 USD · Status: CLEARED FOR DISBURSEMENT</div>
                <div>Hash Anchor: 0x89d2f4e8b39c017a42ea91bc0482da73110e54d8</div>
                <div>Permit Token: Sepolia Dual-Chain NFT #1024 · Verified by Admin Command Center</div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setDecryptFin002(false)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs">
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SCADA PREVIEW MODAL */}
      {previewScada && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0a0a0d] border border-cyan-500/40 rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">SMX-ENG-004 · SCADA Network Topology</h3>
                <p className="text-[10px] text-zinc-400 font-sans">RESTRICTED · Read-only preview assigned by Aarav Mehta</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPreviewScada(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-black border border-zinc-800 text-cyan-300 text-[11px] leading-relaxed space-y-2">
              <div>[SCADA GATEWAY 10.42.0.1]</div>
              <div>├── Substation 4 RTU (Modbus TCP / DNP3) — 10.42.7.19</div>
              <div>├── Feeder Breaker Controller (IEC 61850 GOOSE) — 10.42.7.20</div>
              <div>└── Optical Isolation Barrier — State Hash: 0xf03bd7c219ae5d44</div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setPreviewScada(false)} className="bg-zinc-800 text-zinc-200 text-xs">
                Close preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HANDBOOK DECRYPT MODAL */}
      {decryptHandbook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0a0a0d] border border-emerald-500/40 rounded-2xl p-6 font-mono text-xs space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">SMX-OPS-006 · Employee Handbook 2026</h3>
                <p className="text-[10px] text-emerald-400 font-sans">PUBLIC · AES-256-GCM Decrypted for Session</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDecryptHandbook(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-black border border-zinc-800 text-zinc-300 text-[11px] leading-relaxed space-y-2 font-sans">
              <div className="font-bold text-white font-mono">SECUREMAX OPERATIONAL GUIDELINES // 2026</div>
              <div>1. All cryptographic access tokens are ephemeral and tied to physical hardware enclaves.</div>
              <div>2. Never share session cookies, private key backups, or decrypt passkeys.</div>
              <div>3. Access to restricted critical assets must be requested through Admin NFT permits with verifiable business justification.</div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setDecryptHandbook(false)} className="bg-zinc-800 text-zinc-200 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a0a0d] border border-zinc-800 rounded-2xl p-6 text-center space-y-4 font-mono text-xs shadow-2xl">
            <div className="font-bold text-white uppercase">Credential QR</div>
            <div className="p-6 rounded-xl bg-white text-black inline-block mx-auto">
              <QrCode className="w-32 h-32" />
            </div>
            <div className="text-[11px] text-zinc-400 break-all">did:securemax:0x3333333333333333333333333333333333333333</div>
            <Button size="sm" onClick={() => setShowQrModal(false)} className="bg-zinc-800 text-zinc-200 text-xs w-full">
              Done
            </Button>
          </div>
        </div>
      )}

      {/* GUARDIANS MODAL */}
      {showGuardiansModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0a0d] border border-zinc-800 rounded-2xl p-6 space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase">Social Recovery Guardians (3/3)</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowGuardiansModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-black border border-zinc-800 flex justify-between">
                <span>1. Aarav Mehta (Lead Admin)</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
              <div className="p-3 rounded-lg bg-black border border-zinc-800 flex justify-between">
                <span>2. Riya Sharma (Grid Operations)</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
              <div className="p-3 rounded-lg bg-black border border-zinc-800 flex justify-between">
                <span>3. Neha Iyer (Compliance Auditor)</span>
                <span className="text-emerald-400">ACTIVE</span>
              </div>
            </div>
            <div className="text-[10px] text-zinc-500 font-sans">2 of 3 guardian signatures required to restore a lost wallet session.</div>
          </div>
        </div>
      )}

    </div>
  );
}
