'use client';

import * as React from 'react';
import { 
  Smartphone, 
  Laptop, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Copy, 
  AlertCircle,
  Key,
  User,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnrolledDevice {
  id: string;
  deviceName: string;
  status: 'ACTIVE' | 'REVOKED';
  isAdminDevice: boolean;
  userId?: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  lastUsedAt: string;
  publicKeyFingerprint: string;
}

interface PersonnelOption {
  id: string;
  name: string;
  email: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = React.useState<EnrolledDevice[]>([]);
  const [personnel, setPersonnel] = React.useState<PersonnelOption[]>([]);
  const [userRole, setUserRole] = React.useState<string>('USER');
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  // Enrollment State
  const [showAdminEnrollModal, setShowAdminEnrollModal] = React.useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = React.useState<string>('');
  const [newDeviceLabel, setNewDeviceLabel] = React.useState<string>('Field Tactical Tablet');

  const [enrollmentCode, setEnrollmentCode] = React.useState<string | null>(null);
  const [enrollmentRecipient, setEnrollmentRecipient] = React.useState<string | null>(null);
  const [enrollmentExpires, setEnrollmentExpires] = React.useState<string | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = React.useState(false);
  const [enrollmentError, setEnrollmentError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const fetchDevices = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
        if (data.personnel) {
          setPersonnel(data.personnel);
          if (data.personnel.length > 0 && !selectedPersonnelId) {
            setSelectedPersonnelId(data.personnel[0].id);
          }
        }
        if (data.user) {
          setUserRole(data.user.role);
          setUserEmail(data.user.email);
        }
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPersonnelId]);

  React.useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Admin initiates enrollment for a selected user
  const handleAdminStartEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonnelId) {
      setEnrollmentError('Please select a team member to issue a pairing token.');
      return;
    }

    setEnrollmentLoading(true);
    setEnrollmentError(null);

    try {
      const res = await fetch('/api/devices/enrollment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: selectedPersonnelId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate enrollment token');

      setEnrollmentCode(data.enrollment.code);
      setEnrollmentExpires(data.enrollment.expiresAt);
      setEnrollmentRecipient(`${data.enrollment.targetUserName} (${data.enrollment.targetUserEmail})`);
      setShowAdminEnrollModal(false);
    } catch (err: any) {
      setEnrollmentError(err.message || 'Failed to issue enrollment token');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // Regular user initiates enrollment for self
  const handleUserStartEnrollment = async () => {
    setEnrollmentLoading(true);
    setEnrollmentError(null);
    try {
      const res = await fetch('/api/devices/enrollment/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment not permitted');

      setEnrollmentCode(data.enrollment.code);
      setEnrollmentExpires(data.enrollment.expiresAt);
      setEnrollmentRecipient('Your Account');
    } catch (err: any) {
      setEnrollmentError(err.message || 'Failed to initiate enrollment');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string, label: string) => {
    if (!confirm(`Are you sure you want to revoke ${label}? It will instantly lose cryptographic access.`)) {
      return;
    }
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke device');
      await fetchDevices();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke device');
    }
  };

  const handleCopyCode = () => {
    if (enrollmentCode) {
      navigator.clipboard.writeText(enrollmentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAdmin = userRole === 'ADMIN';

  return (
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
            <Smartphone className="h-7 w-7 text-cyan-400" />
            Device Management & Cryptographic Keys
          </h2>
          <p className="text-xs text-zinc-400 font-mono tracking-wider mt-1">
            Hardware-Isolated P-256 Credentials • Zero Shared Private Keys
          </p>
        </div>

        {/* Master Action Button */}
        {isAdmin ? (
          <Button 
            onClick={() => { setShowAdminEnrollModal(true); setEnrollmentError(null); }}
            className="bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Authorize New User Device
          </Button>
        ) : (
          <Button 
            onClick={handleUserStartEnrollment}
            disabled={enrollmentLoading}
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Enroll Secondary Device
          </Button>
        )}
      </div>

      {/* Admin Notice Banner */}
      {isAdmin ? (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                Root Admin Terminal Bound • Team Device Authority Active
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-light">
                Root administrative access is strictly locked to this authenticated physical machine. As the Security Administrator, you authorize, monitor, and revoke hardware credentials for all field personnel below.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAdminEnrollModal(true)}
            className="shrink-0 bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-mono"
          >
            + Enroll User Device
          </Button>
        </div>
      ) : (
        <div className="bg-[#0a0a0c] border border-zinc-800 rounded-2xl p-5 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
              Independent Cryptographic Keys
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every device generates its own private key inside its local secure enclave. Keys are never copied or uploaded.
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE ENROLLMENT CODE DISPLAY CARD */}
      {enrollmentCode && (
        <Card className="border-cyan-500/40 bg-[#0a0f18] backdrop-blur animate-in fade-in slide-in-from-top-3 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <CardHeader className="pb-3 border-b border-cyan-500/20">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base text-cyan-400 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                One-Time Hardware Pairing Token Issued
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEnrollmentCode(null)}
                className="text-zinc-400 hover:text-zinc-100 text-xs"
              >
                Close
              </Button>
            </div>
            <CardDescription className="text-xs text-zinc-300">
              Assigned Recipient: <span className="text-cyan-300 font-semibold">{enrollmentRecipient}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                Pairing Token (Valid 15 Minutes)
              </div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-mono font-bold tracking-widest text-cyan-300 bg-black/80 px-5 py-2.5 rounded-xl border border-cyan-500/40 select-all shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  {enrollmentCode}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopyCode}
                  className="border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 rounded-xl h-11 w-11"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <span className="text-xs font-mono text-emerald-400">Copied to clipboard!</span>}
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 space-y-1.5 max-w-md">
              <div className="text-zinc-200 font-bold text-xs mb-1">Pairing Instructions for Operator:</div>
              <div>1. Open SecureMAX on the new mobile phone or tablet.</div>
              <div>2. Click &quot;Scan QR Code&quot; or &quot;Register here&quot;.</div>
              <div>3. Enter token <strong>{enrollmentCode}</strong> to generate local P-256 keys.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {enrollmentError && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{enrollmentError}</span>
        </div>
      )}

      {/* ALL REGISTERED DEVICES LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono tracking-widest text-zinc-400 uppercase flex items-center gap-2">
            <Laptop className="w-4 h-4 text-cyan-400" />
            {isAdmin ? `All Authorized Organization Hardware (${devices.length})` : `Your Authorized Devices (${devices.length})`}
          </h3>
          <span className="text-[11px] font-mono text-zinc-500">
            Enclave: ECDSA Curve P-256
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-xs font-mono">
            Loading hardware credentials...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {devices.map((device) => {
              const isActive = device.status === 'ACTIVE';
              return (
                <Card 
                  key={device.id} 
                  className={`bg-[#0a0f18] border transition-all rounded-2xl ${
                    isActive ? 'border-zinc-800 hover:border-cyan-500/40' : 'border-red-950/50 opacity-60'
                  }`}
                >
                  <CardHeader className="pb-3 pt-5 px-5 flex flex-row items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${
                        device.isAdminDevice 
                          ? 'bg-amber-950/30 border-amber-500/30 text-amber-400' 
                          : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400'
                      }`}>
                        {device.isAdminDevice ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                          {device.deviceName}
                        </CardTitle>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {device.isAdminDevice 
                            ? 'Root Administrator' 
                            : device.userName 
                            ? `${device.userName} (${device.userEmail})` 
                            : 'Field Member'}
                        </div>
                      </div>
                    </div>

                    <Badge 
                      variant="outline" 
                      className={`text-[10px] font-mono tracking-wider ${
                        isActive 
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/30' 
                          : 'border-red-500/30 text-red-400 bg-red-950/30'
                      }`}
                    >
                      {device.status}
                    </Badge>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 pt-2 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-zinc-400 text-[11px] pb-2 border-b border-zinc-800/60">
                      <span>KEY TYPE</span>
                      <span className="text-cyan-400">ECDSA P-256</span>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400 text-[11px] pb-2 border-b border-zinc-800/60">
                      <span>FINGERPRINT</span>
                      <span className="text-zinc-300 text-[10px]">{device.publicKeyFingerprint}</span>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400 text-[11px] pb-2 border-b border-zinc-800/60">
                      <span>ENROLLED</span>
                      <span className="text-zinc-400">{new Date(device.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Revocation Control */}
                    {!device.isAdminDevice && isActive && (
                      <div className="pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeDevice(device.id, device.deviceName)}
                          className="w-full text-red-400 hover:text-red-300 hover:bg-red-950/30 text-xs flex items-center justify-center gap-2 border border-red-500/20 rounded-xl"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke Device Access
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ADMIN DEVICE ENROLLMENT MODAL                                        */}
      {/* ==================================================================== */}
      {showAdminEnrollModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0a0f18] border border-cyan-500/40 rounded-3xl p-7 relative shadow-[0_0_60px_rgba(6,182,212,0.25)]">
            <button
              type="button"
              onClick={() => setShowAdminEnrollModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white cursor-pointer select-none touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Authorize User Device
                </h3>
                <p className="text-xs text-zinc-400 font-light">
                  Issue a pairing token for a team member&apos;s new hardware.
                </p>
              </div>
            </div>

            <form onSubmit={handleAdminStartEnrollment} className="space-y-4 mt-5">
              
              {/* Select Team Member */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Select Team Member
                </label>
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400"
                >
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Device Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Device Description / Label
                </label>
                <input
                  type="text"
                  value={newDeviceLabel}
                  onChange={(e) => setNewDeviceLabel(e.target.value)}
                  placeholder="e.g. Field Tactical Tablet, Mission Phone"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-zinc-300 font-light leading-relaxed">
                💡 <strong>Zero-Trust Notice</strong>: Generating this pairing token allows the operator&apos;s hardware to generate its own non-extractable P-256 private key and register directly to their identity.
              </div>

              <button
                type="submit"
                disabled={enrollmentLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none touch-manipulation active:opacity-90 mt-2"
              >
                {enrollmentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                GENERATE PAIRING TOKEN
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
