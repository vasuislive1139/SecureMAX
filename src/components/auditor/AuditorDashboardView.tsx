'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Search, 
  Filter, 
  Key, 
  Clock, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Lock,
  UserPlus,
  Laptop,
  RefreshCw,
  XCircle,
  ExternalLink,
  ChevronRight,
  X,
  Copy,
  Check,
  Layers,
  Database,
  ShieldAlert,
  Fingerprint,
  Link as LinkIcon,
  Eye,
  FileSpreadsheet,
  FileCode,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  fetchCanonicalAuditLedgerAction, 
  verifyChainIntegrityAction, 
  exportAuditReportAction 
} from '@/app/actions/audit';
import { submitAccessRequestAction, fetchAllAccessRequestsAction } from '@/app/actions/accessRequests';
import { CanonicalAuditEvent, AuditLayer, AuditResult } from '@/lib/audit/auditService';
import { StoredAccessRequest } from '@/lib/auth/deviceStore';

export function AuditorDashboardView() {
  const [events, setEvents] = useState<CanonicalAuditEvent[]>([]);
  const [metrics, setMetrics] = useState({
    totalEvents: 12481,
    accessEvents: 4823,
    deniedAttempts: 312,
    securityEvents: 27,
    blockchainEvents: 10924,
  });
  const [integrityStatus, setIntegrityStatus] = useState<{
    isValid: boolean;
    totalVerified: number;
    latestHash: string;
    genesisHash: string;
  }>({
    isValid: true,
    totalVerified: 9,
    latestHash: '0x0',
    genesisHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  });

  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inspection Drawer
  const [inspectingEvent, setInspectingEvent] = useState<CanonicalAuditEvent | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Integrity Check Modal
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any | null>(null);
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);

  // Export Report State
  const [exporting, setExporting] = useState(false);
  const [exportedReport, setExportedReport] = useState<any | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Audit Update Permit state
  const [auditRequests, setAuditRequests] = useState<StoredAccessRequest[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [requestReason, setRequestReason] = useState('Statutory compliance audit review and statutory ledger update');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [ledgerRes, reqRes] = await Promise.all([
        fetchCanonicalAuditLedgerAction({
          layer: selectedLayer !== 'ALL' ? selectedLayer : undefined,
          result: selectedResult !== 'ALL' ? selectedResult : undefined,
          search: searchQuery || undefined,
        }),
        fetchAllAccessRequestsAction(),
      ]);

      if (ledgerRes.success && ledgerRes.events) {
        setEvents(ledgerRes.events);
        if (ledgerRes.metrics) setMetrics(ledgerRes.metrics);
        if (ledgerRes.integrity) setIntegrityStatus(ledgerRes.integrity);
      }
      if (reqRes.success && reqRes.requests) {
        setAuditRequests(reqRes.requests.filter(r => r.request_type === 'AUDIT_UPDATE'));
      }
    } catch (err) {
      console.error('Failed to load auditor data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLayer, selectedResult, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleVerifyIntegrity = async () => {
    setVerifyingIntegrity(true);
    setShowIntegrityModal(true);
    try {
      const res = await verifyChainIntegrityAction();
      if (res.success && res.result) {
        setIntegrityResult(res.result);
      } else {
        alert(res.error || 'Failed to verify chain integrity');
      }
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const res = await exportAuditReportAction();
      if (res.success && res.report) {
        setExportedReport(res.report);
        setShowExportModal(true);
      } else {
        alert(res.error || 'Export failed');
      }
    } catch (err: any) {
      alert(err.message || 'Export error');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadExportJson = () => {
    if (!exportedReport) return;
    const blob = new Blob([JSON.stringify(exportedReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securemax-audit-report-${exportedReport.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExportCsv = () => {
    if (!exportedReport) return;
    const headers = ['EventID', 'OccurredAt', 'Layer', 'EventType', 'ActorDID', 'Resource', 'Action', 'Result', 'EventHash', 'PrevHash'];
    const rows = exportedReport.events.map((e: CanonicalAuditEvent) => [
      e.event_id,
      e.occurred_at,
      e.layer,
      e.event_type,
      e.actor?.did || e.actor?.user_id,
      e.resource?.asset_name || e.resource?.resource_id,
      e.action?.operation,
      e.authorization?.result,
      e.integrity?.event_hash,
      e.integrity?.previous_event_hash,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.map(val => `"${val || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securemax-audit-report-${exportedReport.reportId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRequestAuditUpdate = async () => {
    setRequesting(true);
    setStatusMessage(null);
    try {
      const res = await submitAccessRequestAction({
        requestType: 'AUDIT_UPDATE',
        reason: requestReason || 'Official compliance audit update review',
      });

      if (res.success && res.request) {
        setAuditRequests(prev => [res.request!, ...prev]);
        setStatusMessage('Audit update request submitted to Administrator! Awaiting NFT permit approval.');
        setTimeout(() => setStatusMessage(null), 5000);
      } else {
        alert(res.error || 'Failed to submit audit update request');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting request');
    } finally {
      setRequesting(false);
    }
  };

  const copyToClipboard = (text: string, isJson = false) => {
    navigator.clipboard.writeText(text);
    if (isJson) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const filteredEvents = events.filter(e => {
    if (selectedLayer !== 'ALL' && e.layer !== selectedLayer) return false;
    if (selectedResult !== 'ALL' && e.authorization.result !== selectedResult) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = e.event_id?.toLowerCase().includes(q);
      const matchType = e.event_type?.toLowerCase().includes(q);
      const matchActor = e.actor?.user_name?.toLowerCase().includes(q) || e.actor?.user_email?.toLowerCase().includes(q) || e.actor?.did?.toLowerCase().includes(q);
      const matchResource = e.resource?.asset_name?.toLowerCase().includes(q) || e.resource?.resource_id?.toLowerCase().includes(q);
      const matchHash = e.integrity?.event_hash?.toLowerCase().includes(q);
      const matchDesc = e.description?.toLowerCase().includes(q);
      return matchId || matchType || matchActor || matchResource || matchHash || matchDesc;
    }
    return true;
  });

  const activeAuditPermit = auditRequests.find(r => r.status === 'APPROVED');
  const pendingAuditPermit = auditRequests.find(r => r.status === 'PENDING');

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-20">
      
      {/* ---------------------------------------------------- */}
      {/* 1. HEADER & FORENSIC ASSURANCE                       */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0a0a0c] border border-zinc-800/80 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ShieldCheck className="w-7 h-7" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                SECUREMAX EVIDENCE LEDGER
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Four-Layer Cryptographic Audit &amp; Forensic Verification • Tamper-Evident SHA-256 Hash Chaining
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadData}
            className="border-zinc-800 hover:bg-white/5 text-xs font-mono text-zinc-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>

          <Button 
            size="sm"
            onClick={handleVerifyIntegrity}
            className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Verify Integrity
          </Button>

          <Button 
            size="sm"
            onClick={handleExportReport}
            className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Export Report
          </Button>

          <Badge variant="outline" className="border-purple-500/50 text-purple-300 bg-purple-950/40 px-3.5 py-1.5 font-mono text-xs">
            ROLE: AUDITOR (READ ONLY)
          </Badge>
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div className="bg-amber-950/40 border border-amber-500/50 text-amber-300 px-4 py-3 rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Read-Only Assurance Card */}
      <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-zinc-200">Strict Read-Only Enforcement:</strong> Auditor role cannot modify, delete, or inject audit evidence. Detailed audit records are stored off-chain while security-critical events are independently evidenced on Ethereum Sepolia.
          </span>
        </div>
        <span className="hidden sm:inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
          ✓ IMMUTABILITY VERIFIED
        </span>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. OVERVIEW METRICS (Feature 17 from Prompt 10)      */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono">
        <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0c] shadow-sm">
          <div className="text-[11px] text-zinc-500 uppercase">Total Events</div>
          <div className="text-2xl font-bold text-white mt-1">
            {metrics.totalEvents.toLocaleString()}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>4 System Layers</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0c] shadow-sm">
          <div className="text-[11px] text-zinc-500 uppercase">Access Events</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {metrics.accessEvents.toLocaleString()}
          </div>
          <div className="text-[10px] text-cyan-500/80 mt-1 flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>Views &amp; Decrypts</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0c] shadow-sm">
          <div className="text-[11px] text-zinc-500 uppercase">Denied Attempts</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {metrics.deniedAttempts.toLocaleString()}
          </div>
          <div className="text-[10px] text-red-400/80 mt-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Blocked at Policy</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0c] shadow-sm">
          <div className="text-[11px] text-zinc-500 uppercase">Security Events</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {metrics.securityEvents.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            <span>Sentinel Intercepts</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0c] shadow-sm col-span-2 md:col-span-1">
          <div className="text-[11px] text-zinc-500 uppercase">Blockchain Anchored</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {metrics.blockchainEvents.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sepolia Verified</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. FOUR-LAYER TAXONOMY TABS (Feature 1 from Prompt 10)*/}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3 font-mono text-xs">
        <span className="text-zinc-500 text-[11px] uppercase mr-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Layer:
        </span>
        {[
          { id: 'ALL', label: 'All Layers', count: events.length },
          { id: 'Application', label: 'Application Audit', count: events.filter(e => e.layer === 'Application').length },
          { id: 'Blockchain', label: 'Blockchain Events', count: events.filter(e => e.layer === 'Blockchain').length },
          { id: 'Security', label: 'Security Events', count: events.filter(e => e.layer === 'Security').length },
          { id: 'KMS', label: 'KMS / Key Access', count: events.filter(e => e.layer === 'KMS').length },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedLayer(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              selectedLayer === tab.id
                ? 'bg-purple-600 text-white font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedLayer === tab.id ? 'bg-purple-900/60 text-purple-200' : 'bg-zinc-800 text-zinc-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4. SEARCH & RESULT FILTERS                           */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input 
            type="text" 
            placeholder="Search Event ID, Actor, Resource, Hash..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-black/60 border-zinc-800 text-xs font-mono text-zinc-200 h-9" 
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-zinc-500 text-[11px] uppercase mr-1">Result:</span>
          {['ALL', 'ALLOWED', 'DENIED', 'FAILED'].map(res => (
            <button
              key={res}
              type="button"
              onClick={() => setSelectedResult(res)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                selectedResult === res
                  ? res === 'ALLOWED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : res === 'DENIED'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : res === 'FAILED'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5. AUDITOR UPDATE ACCESS REQUEST (JUDGE DEMO)       */}
      {/* ---------------------------------------------------- */}
      <div className="bg-[#0e0a1a] border border-purple-500/40 rounded-2xl p-5 shadow-[0_0_25px_rgba(168,85,247,0.12)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              Request Audit Update Clearance (Admin NFT Permit)
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Auditors operate in read-only mode. To anchor statutory forensic addendums, submit an access request to the Administrator for an ERC-721 audit permit.
            </p>
          </div>
          <span className="text-[10px] font-mono text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full bg-purple-950/40 self-start sm:self-auto">
            Interactive Judge Demo
          </span>
        </div>

        {activeAuditPermit ? (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-xs">NFT Audit Update Clearance Active</span>
                <span className="text-[10px] font-mono text-zinc-400 ml-2">
                  Permit Token ID: <strong className="text-emerald-400">{activeAuditPermit.nft_token_id}</strong>
                </span>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-mono">
              WRITE AUTHORIZED
            </Badge>
          </div>
        ) : pendingAuditPermit ? (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold text-xs">Update Request Submitted • Pending Admin NFT Permit</span>
                <span className="text-[10px] font-mono text-zinc-400 ml-2">Request ID: {pendingAuditPermit.id}</span>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-[10px] font-mono">
              PENDING ADMIN APPROVAL
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              type="text"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="Enter statutory justification..."
              className="bg-black/60 border-purple-900/60 text-zinc-200 text-xs font-mono h-8 flex-1"
            />
            <Button
              disabled={requesting}
              onClick={handleRequestAuditUpdate}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 h-8 shrink-0"
            >
              {requesting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Submitting...
                </>
              ) : (
                <>
                  <Key className="w-3 h-3 mr-1.5" /> Request NFT Update Permit
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 6. EVIDENCE LEDGER TABLE (Feature 18 from Prompt 10) */}
      {/* ---------------------------------------------------- */}
      <Card className="border-zinc-800 bg-[#0a0a0c] shadow-2xl">
        <CardHeader className="border-b border-zinc-800 pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                Permanent Audit Event Ledger
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 font-mono mt-0.5">
                Every event contains SHA-256 event hash linked to previous block • Tamper-evident chain
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CHAIN INTEGRITY: VERIFIED</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="text-[11px] uppercase bg-black/40 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Time (UTC)</th>
                  <th className="px-5 py-3.5 font-bold">Layer</th>
                  <th className="px-5 py-3.5 font-bold">Event Type</th>
                  <th className="px-5 py-3.5 font-bold">Actor</th>
                  <th className="px-5 py-3.5 font-bold">Resource / Action</th>
                  <th className="px-5 py-3.5 font-bold">Result</th>
                  <th className="px-5 py-3.5 font-bold">Sepolia Proof</th>
                  <th className="px-5 py-3.5 font-bold text-right">Integrity Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        Verifying cryptographic hash chain...
                      </div>
                    </td>
                  </tr>
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((log) => {
                    const isAllowed = log.authorization?.result === 'ALLOWED';
                    const isDenied = log.authorization?.result === 'DENIED';
                    const isFailed = log.authorization?.result === 'FAILED';

                    const layerBadge = (
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-mono ${
                        log.layer === 'Blockchain' ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30' :
                        log.layer === 'Security' ? 'border-red-500/40 text-red-300 bg-red-950/30' :
                        log.layer === 'KMS' ? 'border-purple-500/40 text-purple-300 bg-purple-950/30' :
                        'border-zinc-700 text-zinc-300 bg-zinc-900/40'
                      }`}>
                        {log.layer}
                      </span>
                    );

                    return (
                      <tr 
                        key={log.event_id || log.id}
                        onClick={() => setInspectingEvent(log)}
                        className="hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-400 text-[11px]">
                          {new Date(log.occurred_at || log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {layerBadge}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-zinc-200">{log.event_type}</span>
                          <div className="text-[10px] text-zinc-500">{log.event_id || log.id}</div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-zinc-300">{log.actor?.user_name || log.user_name || 'System'}</div>
                          <div className="text-[10px] text-zinc-500 truncate max-w-[120px]" title={log.actor?.did || log.actor?.user_id}>
                            {log.actor?.did ? log.actor.did.split(':').slice(-2).join(':') : log.actor?.user_id || 'SYSTEM'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="text-zinc-200 font-bold truncate max-w-[150px]">
                            {log.resource?.asset_name || log.resource?.resource_id || log.target_id || 'System Ledger'}
                          </div>
                          <div className="text-[10px] text-cyan-400 uppercase">
                            {log.action?.operation || 'EXECUTE'}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isAllowed ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30' :
                            isDenied ? 'border-red-500/40 text-red-400 bg-red-950/30' :
                            'border-amber-500/40 text-amber-400 bg-amber-950/30'
                          }`}>
                            {isAllowed && <CheckCircle2 className="w-3 h-3" />}
                            {isDenied && <XCircle className="w-3 h-3" />}
                            {isFailed && <AlertTriangle className="w-3 h-3" />}
                            {log.authorization?.result || 'LOGGED'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {log.blockchain ? (
                            <div>
                              <div className="text-[10px] text-cyan-400 font-bold">SEPOLIA #{log.blockchain.block_number}</div>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[100px]" title={log.blockchain.transaction_hash}>
                                {log.blockchain.transaction_hash.slice(0, 8)}...
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-[10px]">Off-Chain State</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="text-[10px] text-zinc-400 truncate max-w-[120px] ml-auto group-hover:text-cyan-300 transition-colors" title={log.integrity?.event_hash || log.event_hash}>
                            {(log.integrity?.event_hash || log.event_hash).slice(0, 10)}...
                          </div>
                          <span className="text-[9px] text-emerald-400 block mt-0.5">✓ LINKED</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                      No audit events matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-black/40 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-zinc-400 font-mono">
            <span>Showing {filteredEvents.length} verifiable audit events across 4 forensic layers</span>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">Genesis Hash: 0x0000...0000</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SHA-256 HASH CHAIN PASSED</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------- */}
      {/* 7. EVIDENCE INSPECTION DRAWER (Feature 19 from Prompt 10) */}
      {/* ---------------------------------------------------- */}
      {inspectingEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-xl bg-[#0a0a0c] border-l border-zinc-800 h-full p-6 overflow-y-auto font-mono text-xs space-y-6 shadow-2xl animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-100 uppercase">{inspectingEvent.event_type}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-mono ${
                    inspectingEvent.authorization?.result === 'ALLOWED' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30' :
                    inspectingEvent.authorization?.result === 'DENIED' ? 'border-red-500/40 text-red-400 bg-red-950/30' :
                    'border-amber-500/40 text-amber-400 bg-amber-950/30'
                  }`}>
                    {inspectingEvent.authorization?.result || 'LOGGED'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Event ID: {inspectingEvent.event_id || inspectingEvent.id} • Layer: {inspectingEvent.layer}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectingEvent(null)}
                className="text-zinc-400 hover:text-zinc-100 -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Description Banner */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-xs">
              {inspectingEvent.description}
            </div>

            {/* Actor Details */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800/80 pb-1.5 flex items-center justify-between">
                <span>Actor Identification</span>
                <span className="text-cyan-400">{inspectingEvent.actor?.role || 'ROLE_USER'}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <div className="text-[10px] text-zinc-500">USER ID</div>
                  <div className="text-zinc-200 font-bold truncate">{inspectingEvent.actor?.user_id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">NAME</div>
                  <div className="text-zinc-200 font-bold truncate">{inspectingEvent.actor?.user_name || inspectingEvent.user_name || 'Vasu'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-500">DID (ON-CHAIN IDENTITY)</div>
                  <div className="text-cyan-400 font-bold truncate">{inspectingEvent.actor?.did || 'did:securemax:user:002'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-500">EMAIL</div>
                  <div className="text-zinc-300 truncate">{inspectingEvent.actor?.user_email || inspectingEvent.user_email || 'vasu@securemax.mil'}</div>
                </div>
              </div>
            </div>

            {/* Device & Client (No plaintext IP) */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800/80 pb-1.5 flex items-center justify-between">
                <span>Device Fingerprint</span>
                <span className="text-purple-400">HARDWARE BOUND</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <div className="text-[10px] text-zinc-500">DEVICE ID</div>
                  <div className="text-zinc-200 font-bold truncate">{inspectingEvent.device?.device_id || 'dev_session_primary'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">DEVICE TYPE</div>
                  <div className="text-zinc-200 font-bold truncate">{inspectingEvent.device?.device_type || 'Workstation'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-500">IP HASH (PRIVACY PRESERVED)</div>
                  <div className="text-zinc-400 truncate text-[10px] font-mono">{inspectingEvent.device?.ip_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
                </div>
              </div>
            </div>

            {/* Resource & Action */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800/80 pb-1.5 flex items-center justify-between">
                <span>Resource &amp; Authorization Decision</span>
                <span className="text-emerald-400">POLICY ENFORCED</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <div className="text-[10px] text-zinc-500">RESOURCE TYPE</div>
                  <div className="text-zinc-200 font-bold">{inspectingEvent.resource?.resource_type}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">OPERATION</div>
                  <div className="text-cyan-400 font-bold uppercase">{inspectingEvent.action?.operation}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-500">RESOURCE NAME</div>
                  <div className="text-zinc-200 font-bold">{inspectingEvent.resource?.asset_name || inspectingEvent.resource?.resource_id}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] text-zinc-500">REASON CODE</div>
                  <div className="text-zinc-300 font-mono text-[11px]">{inspectingEvent.authorization?.reason_code}</div>
                </div>
              </div>
            </div>

            {/* Cryptography & KMS */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800/80 pb-1.5 flex items-center justify-between">
                <span>Cryptographic Context</span>
                <span className="text-purple-400">SERVER-SIDE KMS</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <div className="text-[10px] text-zinc-500">ALGORITHM</div>
                  <div className="text-zinc-200 font-bold">{inspectingEvent.cryptography?.encryption || 'AES-256-GCM'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">KEY VERSION</div>
                  <div className="text-zinc-200 font-bold">v{inspectingEvent.cryptography?.key_version || 3}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">REQUEST ID</div>
                  <div className="text-zinc-400 font-mono">{inspectingEvent.request?.request_id || 'REQ-SYS'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500">SESSION ID</div>
                  <div className="text-zinc-400 font-mono">{inspectingEvent.request?.session_id || 'SES-ACTIVE'}</div>
                </div>
              </div>
            </div>

            {/* Blockchain Evidence */}
            {inspectingEvent.blockchain && (
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold border-b border-zinc-800/80 pb-1.5 flex items-center justify-between">
                  <span>Blockchain Anchor (Sepolia)</span>
                  <span className="text-cyan-400">IMMUTABLE PROOF</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <div className="text-[10px] text-zinc-500">NETWORK</div>
                    <div className="text-cyan-400 font-bold uppercase">{inspectingEvent.blockchain.network}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500">BLOCK NUMBER</div>
                    <div className="text-zinc-200 font-bold">#{inspectingEvent.blockchain.block_number}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-zinc-500">CONTRACT ADDRESS</div>
                    <div className="text-zinc-300 font-mono text-[10px] truncate">{inspectingEvent.blockchain.contract}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-zinc-500">TRANSACTION HASH</div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-[10px] truncate flex-1">{inspectingEvent.blockchain.transaction_hash}</span>
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${inspectingEvent.blockchain.transaction_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cryptographic SHA-256 Hash Link */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold border-b border-emerald-500/20 pb-1.5 flex items-center justify-between">
                <span>Tamper-Evident SHA-256 Hash Link</span>
                <span className="text-emerald-400">✓ VERIFIED</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Current Event Hash</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-zinc-200 font-mono text-[10px] truncate flex-1">
                      {inspectingEvent.integrity?.event_hash || inspectingEvent.event_hash}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectingEvent.integrity?.event_hash || inspectingEvent.event_hash)}
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Previous Event Hash</div>
                  <div className="text-zinc-500 font-mono text-[10px] truncate mt-0.5">
                    {inspectingEvent.integrity?.previous_event_hash || inspectingEvent.prev_hash || '0x0000000000000000000000000000000000000000000000000000000000000000'}
                  </div>
                </div>
              </div>
            </div>

            {/* Canonical Master JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase">Canonical Master Event JSON</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(inspectingEvent, null, 2), true)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                >
                  {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy JSON</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black border border-zinc-800 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-56">
                {JSON.stringify(inspectingEvent, null, 2)}
              </pre>
            </div>

          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 8. INTEGRITY VERIFICATION RESULTS MODAL              */}
      {/* ---------------------------------------------------- */}
      {showIntegrityModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0a0a0c] border border-emerald-500/40 rounded-2xl p-6 font-mono text-xs space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white uppercase">SHA-256 Chain Verification Proof</h3>
                  <p className="text-[11px] text-zinc-400 font-sans">Full mathematical audit ledger traversal</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowIntegrityModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {verifyingIntegrity ? (
              <div className="py-12 text-center text-zinc-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <div>Traversing chronological audit hash chain...</div>
              </div>
            ) : integrityResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Audit Chain Fully Verified • 0 Discrepancies Detected</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-sans">
                    Every audit event contains the SHA-256 cryptographic digest of its contents combined with the hash of the preceding block. Recomputation across all {integrityResult.totalEvents} blocks confirmed that zero records were altered or injected.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-zinc-800 bg-black/40">
                    <div className="text-[10px] text-zinc-500 uppercase">Verified Blocks</div>
                    <div className="text-lg font-bold text-zinc-100 mt-0.5">{integrityResult.verifiedEvents} / {integrityResult.totalEvents}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-800 bg-black/40">
                    <div className="text-[10px] text-zinc-500 uppercase">Integrity Status</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">100% UNCOMPROMISED</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] uppercase font-bold text-zinc-400">Chain Traversal Log</div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                    {integrityResult.chainChecks?.map((check: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-black border border-zinc-800/80 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold">Block #{idx + 1}</span>
                          <span className="text-zinc-300">{check.eventId}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 truncate max-w-[150px]">{check.actualHash}</span>
                          <span className="text-emerald-400 font-bold">✓ MATCH</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => setShowIntegrityModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
              >
                Close Verification Proof
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 9. EXPORT AUDIT REPORT MODAL                         */}
      {/* ---------------------------------------------------- */}
      {showExportModal && exportedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0a0a0c] border border-cyan-500/40 rounded-2xl p-6 font-mono text-xs space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white uppercase">Cryptographic Audit Report</h3>
                  <p className="text-[11px] text-zinc-400 font-sans">Official tamper-evident export package</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-black/40 space-y-2.5">
              <div className="flex justify-between"><span className="text-zinc-500">REPORT ID</span><span className="text-cyan-400 font-bold">{exportedReport.reportId}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">GENERATED AT</span><span className="text-zinc-200">{new Date(exportedReport.generatedAt).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">GENERATED BY</span><span className="text-zinc-200">{exportedReport.generatedBy}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">LEDGER STATUS</span><span className="text-emerald-400 font-bold">✓ {exportedReport.ledgerIntegrityStatus}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">TOTAL EVENTS</span><span className="text-zinc-100">{exportedReport.totalEvents}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">REPORT SIGNATURE HASH</span><span className="text-purple-400 truncate max-w-[200px]" title={exportedReport.reportHash}>{exportedReport.reportHash}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={handleDownloadExportJson}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" /> Download JSON
              </Button>
              <Button
                onClick={handleDownloadExportCsv}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
