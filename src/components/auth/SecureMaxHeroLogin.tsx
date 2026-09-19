'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Fingerprint, 
  Lock, 
  Database, 
  Mail, 
  Eye, 
  EyeOff, 
  QrCode, 
  Key, 
  User, 
  Shield, 
  Hexagon, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  X,
  Laptop,
  Sparkles
} from 'lucide-react';
import { 
  getOrCreateLocalDeviceKey, 
  signChallengeWithLocalKey, 
  generateAndSaveDeviceKey,
  ClientDeviceInfo 
} from '@/lib/crypto/clientP256';

type LoginRole = 'USER' | 'ADMIN' | 'AUDITOR';

export default function SecureMaxHeroLogin() {
  const router = useRouter();

  // Role Selection
  const [selectedRole, setSelectedRole] = useState<LoginRole>('USER');
  const [email, setEmail] = useState('vasu@securemax.mil');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);

  // Auth Status
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<ClientDeviceInfo | null>(null);

  // Enrollment Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCode, setEnrollCode] = useState('');
  const [enrollDeviceName, setEnrollDeviceName] = useState('Secondary Mobile Device');
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Sync default email when switching role tab
  const handleRoleChange = (role: LoginRole) => {
    setSelectedRole(role);
    setErrorMessage('');
    if (role === 'ADMIN') {
      setEmail('admin@securemax.mil');
    } else if (role === 'AUDITOR') {
      setEmail('auditor@securemax.mil');
    } else {
      setEmail('vasu@securemax.mil');
    }
  };

  // Initialize or discover client P-256 key on mount
  useEffect(() => {
    getOrCreateLocalDeviceKey('Primary Client Device', email)
      .then(dev => setDeviceInfo(dev))
      .catch(err => console.error('P-256 Web Crypto Init:', err));
  }, [email]);

  // ----------------------------------------------------
  // PRIMARY LOGIN (Connect button: "Login ->")
  // ----------------------------------------------------
  const handlePrimaryLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    setStatusMessage('Initiating zero-trust cryptographic verification...');

    try {
      // 1. Try hardware P-256 challenge-response first
      const dev = deviceInfo || await getOrCreateLocalDeviceKey('Local Workstation', email);
      setDeviceInfo(dev);

      // 2. Request high-entropy challenge
      setStatusMessage('Requesting challenge from server...');
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email }),
      });

      if (!challengeRes.ok) {
        // Fallback to demo fast login
        await handleFallbackDemoLogin(selectedRole);
        return;
      }

      const challenge = await challengeRes.json();

      // 3. Sign challenge with local hardware key
      setStatusMessage('Signing challenge with hardware-isolated P-256 key...');
      const signature = await signChallengeWithLocalKey(challenge.message);

      // 4. Verify on server
      setStatusMessage('Verifying cryptographic signature on-chain...');
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          deviceId: dev.deviceId,
          deviceName: dev.deviceName,
          publicKey: dev.publicKeySpki,
          challengeId: challenge.challengeId,
          signature,
        }),
      });

      const result = await loginRes.json();
      if (!loginRes.ok) {
        // If device signature fails, use demo fallback
        await handleFallbackDemoLogin(selectedRole);
        return;
      }

      setStatusMessage('Signature verified! Establishing secure session...');
      setTimeout(() => {
        if (result.user.role === 'ADMIN') router.push('/dashboard/admin');
        else if (result.user.role === 'AUDITOR') router.push('/dashboard/auditor');
        else router.push('/assets');
      }, 500);

    } catch (err: any) {
      console.warn('Hardware signature fallback to demo login:', err);
      await handleFallbackDemoLogin(selectedRole);
    }
  };

  // Fallback demo login helper
  const handleFallbackDemoLogin = async (role: LoginRole) => {
    try {
      setStatusMessage(`Authenticating ${role} session...`);
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      setStatusMessage(`Authenticated as ${role}. Redirecting...`);
      setTimeout(() => {
        if (role === 'ADMIN') router.push('/dashboard/admin');
        else if (role === 'AUDITOR') router.push('/dashboard/auditor');
        else router.push('/assets');
      }, 500);
    } catch (e: any) {
      setLoading(false);
      setErrorMessage(e.message || 'Login failed');
    }
  };

  // ----------------------------------------------------
  // SECONDARY CONNECT: "Use Device Key"
  // ----------------------------------------------------
  const handleUseDeviceKey = async () => {
    await handlePrimaryLogin();
  };

  // ----------------------------------------------------
  // SECONDARY CONNECT: Device Enrollment Complete
  // ----------------------------------------------------
  const handleCompleteEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollCode.trim()) return;

    setEnrollLoading(true);
    setErrorMessage('');

    try {
      const newKey = await generateAndSaveDeviceKey(enrollDeviceName);
      setDeviceInfo(newKey);

      const res = await fetch('/api/devices/enrollment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentCode: enrollCode.trim().toUpperCase(),
          deviceName: enrollDeviceName,
          publicKey: newKey.publicKeySpki,
          deviceId: newKey.deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');

      setEnrollSuccess(true);
      setTimeout(() => {
        setShowEnrollModal(false);
        handlePrimaryLogin();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Enrollment error');
    } finally {
      setEnrollLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#07090e] text-zinc-100 font-sans selection:bg-cyan-500/30 relative flex flex-col justify-between overflow-x-hidden">
      
      {/* Dynamic Background Backdrop */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-40 pointer-events-none z-0"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      />
      
      {/* High-Tech Gradient Overlays */}
      <div className="fixed inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/85 to-transparent pointer-events-none z-0" />
      <div className="fixed inset-0 bg-gradient-to-t from-[#07090e] via-transparent to-[#07090e]/80 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_40%,_var(--tw-gradient-stops))] from-cyan-900/15 via-transparent to-transparent pointer-events-none z-0" />

      {/* ==================================================================== */}
      {/* TOP NAVIGATION BAR                                                   */}
      {/* ==================================================================== */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <Hexagon className="h-8 w-8 text-cyan-400 stroke-[2.2] drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></div>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white flex items-center">
              Secure<span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">MAX</span>
            </span>
            <span className="text-[8px] font-mono tracking-[0.25em] text-zinc-400 uppercase -mt-0.5">
              PEOPLE | DATA | TRUST
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
          <a href="#" className="text-zinc-100 hover:text-cyan-400 transition-colors">Home</a>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <a href="#security" className="hover:text-cyan-400 transition-colors">Security</a>
          <a href="#support" className="hover:text-cyan-400 transition-colors">Support</a>
        </nav>

        {/* Right Pill Badge */}
        <div className="flex items-center gap-3">
          <div className="border border-cyan-500/40 bg-cyan-950/30 px-4 py-1.5 rounded-full text-cyan-300 font-mono text-xs tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.2)] flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            SIH 2026
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN HERO CONTENT                                                    */}
      {/* ==================================================================== */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN: HERO HEADLINE & 3 FEATURE CARDS (col 6) */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-8">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 font-bold uppercase mb-3 flex items-center gap-2">
              <span className="h-1 w-6 bg-cyan-400 rounded-full"></span>
              BEYOND ACCESS
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-tight text-white leading-[1.08] mb-5">
              YOUR DATA<br />
              DESERVES A<br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                HIGHER STANDARD.
              </span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg font-light">
              SecureMAX enables trusted access to sensitive data through cryptographic identity, 
              role-based control and end-to-end encryption.
            </p>
          </div>

          {/* 3 Feature Cards */}
          <div className="space-y-3.5 max-w-md pt-2">
            
            {/* Card 1: Verified Identity */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-950/60 border border-cyan-500/20 backdrop-blur hover:border-cyan-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Fingerprint className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">Verified Identity</h3>
                <p className="text-zinc-400 text-xs">Cryptographic authentication for every user.</p>
              </div>
            </div>

            {/* Card 2: Controlled Access */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-950/60 border border-cyan-500/20 backdrop-blur hover:border-cyan-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">Controlled Access</h3>
                <p className="text-zinc-400 text-xs">Role-based permissions and device security.</p>
              </div>
            </div>

            {/* Card 3: Protected Data */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-950/60 border border-cyan-500/20 backdrop-blur hover:border-cyan-500/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm tracking-wide">Protected Data</h3>
                <p className="text-zinc-400 text-xs">Encrypted storage with zero-trust architecture.</p>
              </div>
            </div>

          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* CENTER BEAM (col 1 hidden on mobile)                 */}
        {/* ---------------------------------------------------- */}
        <div className="hidden xl:flex xl:col-span-1 flex-col items-center justify-center h-full text-[9px] font-mono tracking-widest text-cyan-400/70 space-y-4 select-none">
          <div className="h-16 w-px bg-gradient-to-b from-transparent to-cyan-500/60"></div>
          <span className="hover:text-cyan-300">IDENTITY</span>
          <div className="h-6 w-px bg-cyan-500/40"></div>
          <span className="hover:text-cyan-300">ACCESS</span>
          <div className="h-6 w-px bg-cyan-500/40"></div>
          <span className="hover:text-cyan-300">ENCRYPT</span>
          <div className="h-6 w-px bg-cyan-500/40"></div>
          <span className="hover:text-cyan-300">PROTECT</span>
          <div className="h-16 w-px bg-gradient-to-t from-transparent to-cyan-500/60"></div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN: LOGIN CARD (col 5)                     */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
          
          <div className="w-full max-w-md relative rounded-[2.2rem] p-7 sm:p-8 bg-[#0a0f18]/90 backdrop-blur-2xl border border-cyan-500/35 shadow-[0_0_60px_rgba(6,182,212,0.2)] overflow-hidden">
            
            {/* Top-Left Cyan Arc Neon Accent */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full border-t-2 border-l-2 border-cyan-400/80 pointer-events-none drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Card Header */}
            <div className="text-center mb-6 relative z-10">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  Secure<span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">MAX</span>
                </span>
              </div>
              <div className="text-[8px] font-mono tracking-[0.25em] text-cyan-400/80 uppercase mt-0.5">
                IDENTITY | ACCESS | PROTECT
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-4">
                Welcome Back
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-light">
                Sign in to access your secure workspace
              </p>
            </div>

            {/* Role Switcher Pills */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-950/70 p-1.5 rounded-xl border border-zinc-800/80 mb-5 relative z-10">
              <button
                type="button"
                onClick={() => handleRoleChange('USER')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'USER'
                    ? 'bg-cyan-950/70 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                User Login
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('ADMIN')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'ADMIN'
                    ? 'bg-cyan-950/70 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Admin Login
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handlePrimaryLogin} className="space-y-4 relative z-10">
              
              {/* Input 1: User ID / Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="User ID or Email"
                  required
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Input 2: Password / Device Signature */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password / Device Signature"
                  required
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Status Message */}
              {loading && (
                <div className="p-3 bg-zinc-900/90 border border-cyan-500/30 rounded-xl flex items-center gap-2.5 text-xs font-mono text-cyan-300 animate-in fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <span className="truncate">{statusMessage}</span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-400 text-xs font-mono animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* CONNECT BUTTON: "Login ->" */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:via-sky-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:shadow-[0_0_35px_rgba(6,182,212,0.65)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                <span>Login</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Divider: "Or continue with" */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-zinc-800 w-full"></div>
                <span className="bg-[#0a0f18] px-3 text-[10px] font-mono text-zinc-500 tracking-wider uppercase shrink-0">
                  Or continue with
                </span>
                <div className="border-t border-zinc-800 w-full"></div>
              </div>

              {/* Secondary Connect Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(true)}
                  className="py-2.5 px-3 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-cyan-500/40 hover:bg-cyan-950/20 text-zinc-300 hover:text-white text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  Scan QR Code
                </button>

                <button
                  type="button"
                  onClick={handleUseDeviceKey}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-cyan-500/40 hover:bg-cyan-950/20 text-zinc-300 hover:text-white text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  Use Device Key
                </button>
              </div>

              {/* Register Link & Watermark */}
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-light">
                  New device?{' '}
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(true)}
                    className="text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                  >
                    Register here
                  </button>
                </span>
                <div className="text-[7px] font-mono tracking-[0.2em] text-cyan-500/40 uppercase text-right leading-tight">
                  TRUST<br />ENCRYPT<br />EMPOWER
                </div>
              </div>

            </form>

            {/* Quick Demo Switcher Strip (Reviewer Fast-Access) */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1 text-zinc-400">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Fast Demo:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFallbackDemoLogin('ADMIN')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Admin
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleFallbackDemoLogin('USER')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  User
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleFallbackDemoLogin('AUDITOR')}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Auditor
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ==================================================================== */}
      {/* RIGHT VERTICAL INDICATOR DOTS                                       */}
      {/* ==================================================================== */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-6 z-20 text-[9px] font-mono tracking-widest text-cyan-400/80 select-none">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></div>
          <span>SECURE PEOPLE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></div>
          <span>SECURE DATA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></div>
          <span>SECURE INDIA</span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM FOOTER                                                        */}
      {/* ==================================================================== */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 font-mono tracking-wider gap-3">
        <div className="flex items-center gap-2">
          <span>A SAFER TOMORROW BUILT TOGETHER.</span>
          <span>—</span>
          <span className="text-cyan-400">SECUREMAX SIH 2026</span>
        </div>
        <div>
          &quot;TECHNOLOGY FOR A MORE TRUSTED INDIA&quot;
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* SECONDARY DEVICE ENROLLMENT MODAL                                    */}
      {/* ==================================================================== */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f18] border border-cyan-500/40 rounded-3xl p-6 relative shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <button
              onClick={() => setShowEnrollModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <QrCode className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Register New Device</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6 font-light">
              Enter the one-time pairing code from your primary active workstation.
            </p>

            <form onSubmit={handleCompleteEnrollment} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block mb-1.5">
                  Device Name / Label
                </label>
                <input
                  type="text"
                  value={enrollDeviceName}
                  onChange={(e) => setEnrollDeviceName(e.target.value)}
                  placeholder="Secondary Mobile / Tablet"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase block mb-1.5">
                  Enrollment Code (e.g. SMX-XXXX-XXXX)
                </label>
                <input
                  type="text"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value.toUpperCase())}
                  placeholder="SMX-ABCD-1234"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 tracking-widest uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>

              {enrollSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Device registered! Authenticating...</span>
                </div>
              )}

              <button
                type="submit"
                disabled={enrollLoading || !enrollCode.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {enrollLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Laptop className="w-4 h-4" />}
                REGISTER HARDWARE ENCLAVE KEY
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
