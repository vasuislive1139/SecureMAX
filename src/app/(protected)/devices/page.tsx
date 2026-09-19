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
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnrolledDevice {
  id: string;
  deviceName: string;
  status: 'ACTIVE' | 'REVOKED';
  isAdminDevice: boolean;
  createdAt: string;
  lastUsedAt: string;
  publicKeyFingerprint: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = React.useState<EnrolledDevice[]>([]);
  const [userRole, setUserRole] = React.useState<string>('USER');
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [enrollmentCode, setEnrollmentCode] = React.useState<string | null>(null);
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
  }, []);

  React.useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleStartEnrollment = async () => {
    setEnrollmentLoading(true);
    setEnrollmentError(null);
    try {
      const res = await fetch('/api/devices/enrollment/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Enrollment not permitted');
      }
      setEnrollmentCode(data.enrollment.code);
      setEnrollmentExpires(data.enrollment.expiresAt);
    } catch (err: any) {
      setEnrollmentError(err.message || 'Failed to initiate enrollment');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device? It will immediately lose access to SecureMAX.')) {
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
    <div className="space-y-8 font-sans selection:bg-cyan-500/30 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 uppercase flex items-center gap-3">
            <Smartphone className="h-7 w-7 text-cyan-400" />
            Device Credentials (P-256)
          </h2>
          <p className="text-xs text-zinc-500 font-mono tracking-widest mt-1 uppercase">
            Hardware-Isolated Cryptographic Identities • Zero Shared Private Keys
          </p>
        </div>

        {!isAdmin && (
          <Button 
            onClick={handleStartEnrollment}
            disabled={enrollmentLoading}
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono text-xs font-bold shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Enroll New Device
          </Button>
        )}
      </div>

      {/* Admin Notice or User Info Banner */}
      {isAdmin ? (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-5 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
              Administrator Account Is Hardware-Bound
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              In accordance with SecureMAX military-grade defense requirements, administrative access is strictly bound to your primary authenticated hardware terminal. Secondary device enrollment is permanently disabled for root authorities.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#0a0a0c] border border-zinc-800 rounded-lg p-5 flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
              Multi-Device Independent Keypairs
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You can access your assigned data from your laptop, mobile phone, or secondary workstation. Each device generates its own independent P-256 ECDSA key pair locally. Private keys are never uploaded or synced across devices.
            </p>
          </div>
        </div>
      )}

      {/* ENROLLMENT CODE MODAL / BOX (WHEN ACTIVE) */}
      {enrollmentCode && (
        <Card className="border-cyan-500/40 bg-cyan-950/10 backdrop-blur animate-in fade-in slide-in-from-top-3">
          <CardHeader className="pb-3 border-b border-cyan-500/20">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base text-cyan-400 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                One-Time Device Enrollment Code
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
            <CardDescription className="text-xs text-zinc-400">
              Open SecureMAX on your phone or secondary laptop and select <strong>&quot;Enroll This Device&quot;</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Enrollment Code (Valid 10 mins)</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-mono font-bold tracking-widest text-cyan-300 bg-black/60 px-5 py-2.5 rounded border border-cyan-500/30 select-all">
                  {enrollmentCode}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleCopyCode}
                  className="border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && <span className="text-[10px] font-mono text-emerald-400">Copied to clipboard!</span>}
            </div>

            <div className="bg-black/50 p-4 rounded border border-zinc-800 text-xs font-mono text-zinc-400 space-y-1.5 max-w-sm">
              <div className="text-zinc-300 font-bold text-[11px] mb-1">How it works:</div>
              <div>1. Device B enters this 12-character token.</div>
              <div>2. Device B generates a fresh P-256 key pair locally.</div>
              <div>3. Only Device B&apos;s public key is linked to your identity.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {enrollmentError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded text-destructive text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {enrollmentError}
        </div>
      )}

      {/* ENROLLED DEVICES LIST */}
      <div className="space-y-4">
        <h3 className="text-xs font-mono tracking-widest text-zinc-500 uppercase">
          Authorized Devices ({devices.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => {
            const isRevoked = device.status === 'REVOKED';
            return (
              <Card 
                key={device.id} 
                className={`bg-[#0a0a0c] border transition-all ${
                  isRevoked ? 'border-red-950/40 opacity-60' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <CardHeader className="pb-3 border-b border-zinc-900 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${device.isAdminDevice ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                      {device.deviceName.toLowerCase().includes('phone') || device.deviceName.toLowerCase().includes('mobile') ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Laptop className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-zinc-100">{device.deviceName}</CardTitle>
                      <div className="text-[10px] font-mono text-zinc-500">{device.id}</div>
                    </div>
                  </div>

                  <Badge 
                    variant={isRevoked ? 'destructive' : 'outline'}
                    className={`text-[10px] font-mono ${
                      !isRevoked ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : ''
                    }`}
                  >
                    {device.status}
                  </Badge>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 text-xs font-mono">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="text-zinc-600 text-[10px]">KEY ALGORITHM</span>
                    <span className="text-cyan-400 text-[11px] font-bold">ECDSA P-256</span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="text-zinc-600 text-[10px]">PUBLIC FINGERPRINT</span>
                    <span className="text-zinc-300 text-[11px] truncate max-w-[140px]" title={device.publicKeyFingerprint}>
                      {device.publicKeyFingerprint}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="text-zinc-600 text-[10px]">ENROLLED</span>
                    <span className="text-zinc-400 text-[11px]">
                      {new Date(device.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-zinc-400">
                    <span className="text-zinc-600 text-[10px]">LAST ACTIVE</span>
                    <span className="text-zinc-400 text-[11px]">
                      {new Date(device.lastUsedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {!device.isAdminDevice && !isRevoked && (
                    <div className="pt-2 border-t border-zinc-900 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeDevice(device.id)}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-[10px] font-mono h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Revoke Credential
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

    </div>
  );
}
