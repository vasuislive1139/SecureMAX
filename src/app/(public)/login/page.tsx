'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Smartphone, 
  Laptop, 
  Loader2, 
  Server, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  QrCode,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  getOrCreateLocalDeviceKey, 
  signChallengeWithLocalKey, 
  generateAndSaveDeviceKey,
  ClientDeviceInfo 
} from '@/lib/crypto/clientP256';

type TabMode = 'DEVICE_LOGIN' | 'ENROLL_DEVICE' | 'EVAL_DEMO';
type AuthStatus = 'IDLE' | 'CHALLENGING' | 'SIGNING' | 'VERIFYING' | 'SUCCESS' | 'FAILED';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabMode>('DEVICE_LOGIN');
  
  // Device Login State
  const [email, setEmail] = useState('vasu@securemax.mil');
  const [deviceInfo, setDeviceInfo] = useState<ClientDeviceInfo | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('IDLE');
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Device Enrollment State
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('Secondary Workstation');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Initialize or discover local P-256 device key on mount
  useEffect(() => {
    getOrCreateLocalDeviceKey('Primary Client Device', email)
      .then(dev => setDeviceInfo(dev))
      .catch(err => console.error('P-256 Web Crypto Init:', err));
  }, [email]);

  // ----------------------------------------------------
  // FLOW 1: Cryptographic P-256 Device Login
  // ----------------------------------------------------
  const handleDeviceLogin = async (targetEmail = email) => {
    setErrorMessage('');
    setAuthStatus('CHALLENGING');
    setStatusText('Requesting cryptographic challenge from server...');

    try {
      // 1. Ensure local device key exists
      const dev = deviceInfo || await getOrCreateLocalDeviceKey('Local Workstation', targetEmail);
      setDeviceInfo(dev);

      // 2. Request Challenge
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: targetEmail }),
      });

      if (!challengeRes.ok) {
        const data = await challengeRes.json();
        throw new Error(data.error || 'Failed to obtain server challenge');
      }

      const challenge = await challengeRes.json();

      // 3. Device signs challenge locally using non-extractable P-256 private key
      setAuthStatus('SIGNING');
      setStatusText('Device signing challenge with hardware-isolated P-256 private key...');
      
      const signature = await signChallengeWithLocalKey(challenge.message);

      // 4. Send signature to backend for cryptographic verification
      setAuthStatus('VERIFYING');
      setStatusText('Server verifying ECDSA P-256 signature against registered public key...');

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          deviceId: dev.deviceId,
          deviceName: dev.deviceName,
          publicKey: dev.publicKeySpki,
          challengeId: challenge.challengeId,
          signature,
        }),
      });

      const result = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(result.error || 'Cryptographic authentication failed');
      }

      setAuthStatus('SUCCESS');
      setStatusText('Cryptographic signature verified. Session established!');

      // 5. Redirect based on verified role
      setTimeout(() => {
        if (result.user.role === 'ADMIN') router.push('/dashboard/admin');
        else if (result.user.role === 'AUDITOR') router.push('/dashboard/auditor');
        else router.push('/assets');
      }, 700);

    } catch (err: any) {
      console.error(err);
      setAuthStatus('FAILED');
      setErrorMessage(err.message || 'Authentication error');
    }
  };

  // ----------------------------------------------------
  // FLOW 2: Secondary Device Enrollment (e.g. Phone/Laptop B)
  // ----------------------------------------------------
  const handleCompleteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentCode.trim()) return;

    setEnrollLoading(true);
    setErrorMessage('');

    try {
      // 1. Generate brand-new independent P-256 key pair on this device
      const newKey = await generateAndSaveDeviceKey(newDeviceName);
      setDeviceInfo(newKey);

      // 2. Submit public key with one-time enrollment token
      const res = await fetch('/api/devices/enrollment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentCode: enrollmentCode.trim(),
          deviceName: newDeviceName,
          publicKey: newKey.publicKeySpki,
          deviceId: newKey.deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete device enrollment');

      setEnrollSuccess(true);
      setTimeout(() => {
        handleDeviceLogin(data.user.email);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Enrollment error');
    } finally {
      setEnrollLoading(false);
    }
  };

  // ----------------------------------------------------
  // FLOW 3: Fast Role Access for Evaluators
  // ----------------------------------------------------
  const handleFastDemoAccess = async (role: 'ADMIN' | 'USER' | 'AUDITOR') => {
    setAuthStatus('CHALLENGING');
    setStatusText(`Authenticating ${role} session via cryptographic identity...`);

    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fast demo login failed');

      setAuthStatus('SUCCESS');
      setStatusText(`Authorized as ${role}. Redirecting...`);

      setTimeout(() => {
        if (role === 'ADMIN') router.push('/dashboard/admin');
        else if (role === 'AUDITOR') router.push('/dashboard/auditor');
        else router.push('/assets');
      }, 600);
    } catch (err: any) {
      setAuthStatus('FAILED');
      setErrorMessage(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30">
      
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-zinc-950/80 to-zinc-950"></div>

      <Card className="w-full max-w-lg border-zinc-800 bg-[#0a0a0c]/90 backdrop-blur shadow-2xl relative z-10">
        
        {/* Card Header */}
        <CardHeader className="text-center pb-4 border-b border-zinc-800/80">
          <div className="mx-auto w-12 h-12 bg-cyan-500/10 flex items-center justify-center rounded-lg mb-3 border border-cyan-500/20">
            <Lock className="w-6 h-6 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
            SECURE<span className="text-cyan-400">MAX</span>
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs font-mono">
            Cryptographic P-256 Authentication • Zero Shared Private Keys
          </CardDescription>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1 rounded-md mt-4 border border-zinc-800">
            <button
              onClick={() => { setActiveTab('DEVICE_LOGIN'); setErrorMessage(''); }}
              className={`py-1.5 text-xs font-mono tracking-wider rounded transition-all ${
                activeTab === 'DEVICE_LOGIN' 
                  ? 'bg-cyan-500 text-zinc-950 font-bold shadow' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Device Key
            </button>
            <button
              onClick={() => { setActiveTab('ENROLL_DEVICE'); setErrorMessage(''); }}
              className={`py-1.5 text-xs font-mono tracking-wider rounded transition-all ${
                activeTab === 'ENROLL_DEVICE' 
                  ? 'bg-cyan-500 text-zinc-950 font-bold shadow' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Enroll Device
            </button>
            <button
              onClick={() => { setActiveTab('EVAL_DEMO'); setErrorMessage(''); }}
              className={`py-1.5 text-xs font-mono tracking-wider rounded transition-all ${
                activeTab === 'EVAL_DEMO' 
                  ? 'bg-cyan-500 text-zinc-950 font-bold shadow' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Demo Roles
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6 pb-6">

          {/* ---------------------------------------------------- */}
          {/* TAB 1: P-256 DEVICE KEY LOGIN                       */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'DEVICE_LOGIN' && (
            <div className="space-y-5">
              
              {/* Detected Hardware Device Badge */}
              <div className="bg-black/50 border border-zinc-800 rounded-md p-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2.5 text-zinc-300">
                  <Laptop className="w-4 h-4 text-cyan-400" />
                  <span className="truncate max-w-[180px]">{deviceInfo?.deviceName || 'Local Terminal'}</span>
                </div>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">
                  ECDSA P-256 Ready
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase">
                  Identity Email / Account
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vasu@securemax.mil"
                  className="bg-zinc-900/60 border-zinc-800 font-mono text-xs text-zinc-100 focus:border-cyan-500"
                />
              </div>

              {/* Progress status indicators */}
              {authStatus !== 'IDLE' && authStatus !== 'FAILED' && (
                <div className="p-3.5 bg-zinc-900/80 border border-cyan-500/20 rounded-md space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
                    {authStatus === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    )}
                    <span>{statusText}</span>
                  </div>
                </div>
              )}

              {authStatus === 'FAILED' && (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded text-red-400 text-xs font-mono flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <Button
                onClick={() => handleDeviceLogin()}
                disabled={authStatus === 'CHALLENGING' || authStatus === 'SIGNING' || authStatus === 'VERIFYING'}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-bold text-xs py-5 transition-all shadow-lg shadow-cyan-500/20"
              >
                <Key className="w-4 h-4 mr-2" />
                Sign Challenge &amp; Authenticate
              </Button>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 2: SECONDARY DEVICE ENROLLMENT (Phone / Laptop B) */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'ENROLL_DEVICE' && (
            <form onSubmit={handleCompleteEnrollment} className="space-y-4">
              <div className="bg-black/40 border border-zinc-800 rounded p-3 text-xs text-zinc-400 font-mono space-y-1">
                <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  Secondary Device Enrollment
                </div>
                <p className="text-[11px] text-zinc-500">
                  Enter the one-time code from your primary device to bind this browser with its own P-256 key pair.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">
                  One-Time Enrollment Code
                </label>
                <Input
                  type="text"
                  placeholder="SMX-7H4K-92PQ"
                  value={enrollmentCode}
                  onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                  className="font-mono text-sm tracking-widest text-center uppercase bg-zinc-900/60 border-zinc-800 text-cyan-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">
                  Device Label
                </label>
                <Input
                  type="text"
                  placeholder="e.g. My iPhone / Work Laptop"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="font-mono text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200"
                  required
                />
              </div>

              {enrollSuccess && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Device linked successfully! Authenticating...
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded text-red-400 text-xs font-mono flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <Button
                type="submit"
                disabled={enrollLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-mono font-bold text-xs py-5"
              >
                {enrollLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Link &amp; Generate P-256 Keypair
              </Button>
            </form>
          )}

          {/* ---------------------------------------------------- */}
          {/* TAB 3: DEMO ROLES (ONE-CLICK EVALUATION)             */}
          {/* ---------------------------------------------------- */}
          {activeTab === 'EVAL_DEMO' && (
            <div className="space-y-3">
              <div className="text-[11px] font-mono text-zinc-400 mb-2">
                Select a verified persona to execute end-to-end cryptographic challenge-response authentication:
              </div>

              {/* Admin Button */}
              <div 
                onClick={() => handleFastDemoAccess('ADMIN')}
                className="p-3.5 bg-black/50 border border-zinc-800 hover:border-cyan-500/60 rounded-md cursor-pointer transition-all hover:bg-cyan-950/10 flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100">Vasu (System Admin)</span>
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono">
                      Hardware-Bound
                    </Badge>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    admin@securemax.mil • Root Blockchain &amp; Role Authority
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
              </div>

              {/* User Button */}
              <div 
                onClick={() => handleFastDemoAccess('USER')}
                className="p-3.5 bg-black/50 border border-zinc-800 hover:border-cyan-500/60 rounded-md cursor-pointer transition-all hover:bg-cyan-950/10 flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100">Vasu (Lead Engineer)</span>
                    <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] font-mono">
                      Multi-Device Enabled
                    </Badge>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    vasu@securemax.mil • Vault Data: Project Alpha (Decrypt)
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
              </div>

              {/* Auditor Button */}
              <div 
                onClick={() => handleFastDemoAccess('AUDITOR')}
                className="p-3.5 bg-black/50 border border-zinc-800 hover:border-cyan-500/60 rounded-md cursor-pointer transition-all hover:bg-cyan-950/10 flex items-center justify-between group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-100">Compliance Auditor</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono">
                      Audit Trail Only
                    </Badge>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    auditor@securemax.mil • Immutable Sepolia Verification
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
              </div>
            </div>
          )}

          {/* Direct Public Shortcuts */}
          <div className="w-full border-t border-zinc-800/80 pt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 px-1">
            <Link href="/" className="hover:text-cyan-400 transition-colors">
              Command Center
            </Link>
            <span>•</span>
            <Link href="/infrastructure" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <Server className="w-3 h-3 text-cyan-400" />
              Sepolia Live
            </Link>
            <span>•</span>
            <Link href="/assets" className="hover:text-cyan-400 transition-colors">
              Data Vault
            </Link>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
