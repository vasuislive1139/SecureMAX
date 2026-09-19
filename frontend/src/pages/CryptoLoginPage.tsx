import React, { useState, useEffect } from "react";
import { Key, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { requestChallenge, verifyLogin, getAllMockUsers } from "../services/auth/authService";
import { signChallenge } from "../utils/crypto";

interface CryptoLoginPageProps {
  onSuccess: (role: string) => void;
}

export const CryptoLoginPage: React.FC<CryptoLoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [did, setDid] = useState("did:assetchain:usr-admin01");
  const [privateKey, setPrivateKey] = useState("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introPhase, setIntroPhase] = useState(0);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  // Parallax state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Hero Animation Sequence
    const timers = [
      setTimeout(() => setIntroPhase(1), 100),   // Text & Lock appear
      setTimeout(() => setIntroPhase(2), 800),   // Chains out
      setTimeout(() => setIntroPhase(3), 1600),  // Chains grab
      setTimeout(() => setIntroPhase(4), 2200),  // Lock closes
      setTimeout(() => setIntroPhase(5), 2600),  // Verified texts
      setTimeout(() => setIntroPhase(6), 3500),  // Transition to login
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

  const handleAuthenticate = async () => {
    setError(null);
    setLoading(true);
    setLoginStatus("VERIFYING IDENTITY");

    try {
      // 1. Request
      const res1 = await requestChallenge(did.trim());
      if (!res1.success || !res1.data) throw new Error("Identity verification failed.");
      
      setLoginStatus("CHAIN 1 VERIFIED");
      await new Promise(r => setTimeout(r, 600));

      // 2. Sign
      const sig = await signChallenge(res1.data.challengeText, privateKey.trim());
      
      setLoginStatus("CHAIN 2 VERIFIED");
      await new Promise(r => setTimeout(r, 600));

      // 3. Verify
      const res2 = await verifyLogin(did.trim(), res1.data.challengeId, sig);
      if (res2.success && res2.user && res2.token) {
        setLoginStatus("ACCESS GRANTED");
        await new Promise(r => setTimeout(r, 600));
        login(res2.user, res2.token, privateKey);
        onSuccess(res2.user.role);
      } else {
        throw new Error("Access Denied.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoginStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-[#03050a] flex items-center justify-center font-sans"
      onMouseMove={handleMouseMove}
    >
      {/* Background Particles & Grid */}
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-radial opacity-40 pointer-events-none"></div>
      <div 
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{ transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)` }}
      >
        <div className="w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Hero Animation Container */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${
          introPhase >= 6 ? 'opacity-0 scale-95 pointer-events-none -translate-y-20' : 'opacity-100 scale-100'
        }`}
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      >
        
        {/* Main Composition */}
        <div className="relative flex items-center justify-center h-64 w-full max-w-4xl">
          
          {/* Central Lock */}
          <div className={`absolute z-20 transition-all duration-700 ease-out flex flex-col items-center ${
            introPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}>
            <div className={`relative w-24 h-32 flex flex-col items-center ${
              introPhase >= 4 ? 'animate-[hero-cyan-pulse_2s_ease-out_forwards]' : ''
            }`}>
              {/* Shackle */}
              <div className={`w-12 h-12 border-4 border-slate-400 rounded-t-full border-b-0 transition-transform duration-300 ${
                introPhase >= 4 ? 'translate-y-2' : '-translate-y-4'
              }`} style={{ boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)' }}></div>
              
              {/* Body */}
              <div className="w-24 h-20 bg-gradient-to-b from-slate-800 to-slate-950 rounded-xl border border-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden z-10">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-500/10 to-transparent"></div>
                {/* Keyhole */}
                <div className="w-4 h-4 rounded-full bg-slate-950 border border-slate-700 flex flex-col items-center justify-start pt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50"></div>
                  <div className="w-1.5 h-3 bg-cyan-400/50 -mt-0.5 rounded-b-sm"></div>
                </div>
              </div>
            </div>
          </div>

          {/* SECUREMAX TEXT */}
          <div className={`absolute z-30 transition-all duration-1000 ${
            introPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
          }`}>
            <h1 className="text-7xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] flex items-center" style={{ textShadow: '0 4px 20px rgba(6,182,212,0.3)' }}>
              SECURE<span className="text-cyan-400">MAX</span>
            </h1>
          </div>

          {/* LEFT CHAIN */}
          <div className={`absolute left-1/2 top-1/2 -translate-y-1/2 z-10 transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            introPhase === 0 || introPhase === 1 ? 'opacity-0 -translate-x-[50px] scale-50' : 
            introPhase === 2 ? 'opacity-100 -translate-x-[400px] scale-100' : 
            'opacity-100 -translate-x-[150px] scale-100'
          }`}>
            <div className="flex items-center gap-1 opacity-80 filter drop-shadow-[0_5px_15px_rgba(6,182,212,0.3)]">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-6 border-4 border-slate-400 rounded-full bg-gradient-to-r from-slate-800 to-transparent -mr-4 relative">
                  <div className="absolute inset-0 border border-cyan-400/30 rounded-full"></div>
                </div>
              ))}
            </div>
            {introPhase >= 5 && (
              <div className="absolute -top-8 left-10 text-[10px] mono text-cyan-400 animate-fade-in-up bg-cyan-950/50 px-2 py-1 rounded border border-cyan-500/30">
                CHAIN 1 VERIFIED
              </div>
            )}
          </div>

          {/* RIGHT CHAIN */}
          <div className={`absolute right-1/2 top-1/2 -translate-y-1/2 z-10 transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            introPhase === 0 || introPhase === 1 ? 'opacity-0 translate-x-[50px] scale-50' : 
            introPhase === 2 ? 'opacity-100 translate-x-[400px] scale-100' : 
            'opacity-100 translate-x-[150px] scale-100'
          }`}>
            <div className="flex items-center gap-1 opacity-80 filter drop-shadow-[0_5px_15px_rgba(6,182,212,0.3)] flex-row-reverse">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-6 border-4 border-slate-400 rounded-full bg-gradient-to-l from-slate-800 to-transparent -ml-4 relative">
                  <div className="absolute inset-0 border border-cyan-400/30 rounded-full"></div>
                </div>
              ))}
            </div>
            {introPhase >= 5 && (
              <div className="absolute -top-8 right-10 text-[10px] mono text-cyan-400 animate-fade-in-up bg-cyan-950/50 px-2 py-1 rounded border border-cyan-500/30">
                CHAIN 2 VERIFIED
              </div>
            )}
          </div>

        </div>

        {/* Security Verified Text */}
        <div className={`mt-16 text-sm mono text-emerald-400 flex items-center gap-2 transition-all duration-500 ${
          introPhase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <ShieldCheck className="w-5 h-5" /> SECURITY VERIFIED
        </div>
      </div>

      {/* LOGIN FORM (Phase 6) */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
          introPhase >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
               <ShieldCheck className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            </div>
            <h2 className="text-3xl font-bold tracking-widest text-white mb-2">SECURE<span className="text-cyan-400">MAX</span></h2>
            <p className="text-[10px] mono tracking-[0.3em] text-slate-500 uppercase">Secure Digital Access</p>
          </div>

          {/* Form */}
          <div className="glass-card p-8 space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-bold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold tracking-widest text-slate-400 mb-2 uppercase">Identity / Username</label>
              <input
                type="text"
                value={did}
                onChange={(e) => setDid(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest text-slate-400 mb-2 uppercase">Password / Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono pr-10 disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-4 top-3.5" />
              </div>
            </div>

            <button
              onClick={handleAuthenticate}
              disabled={loading}
              className="btn-3d btn-3d-cyan w-full py-4 rounded-lg flex items-center justify-center gap-2 group relative overflow-hidden"
            >
              {loading ? (
                <span className="text-xs font-bold tracking-widest uppercase animate-pulse">{loginStatus}</span>
              ) : (
                <span className="text-xs font-bold tracking-widest uppercase">Authenticate</span>
              )}
              {!loading && <Lock className="w-4 h-4 group-hover:text-white text-cyan-200 transition-colors" />}
            </button>
          </div>

          {/* Chain Status Footer */}
          <div className="mt-8 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] mono text-slate-500">CHAIN 1 ONLINE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[9px] mono text-slate-500">CHAIN 2 ONLINE</span>
            </div>
          </div>
          
          {/* Hidden Quick Profiles for Dev */}
          <div className="mt-10 flex justify-center gap-3 opacity-20 hover:opacity-100 transition-opacity">
            {getAllMockUsers().map(u => (
              <button 
                key={u.did}
                onClick={() => {
                  setDid(u.did);
                  setPrivateKey(u.role === "ADMIN" ? "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" : 
                              u.role === "MANAGER" ? "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" : 
                              "0x5de4111afa1a4b94908f83103eb2f9547b1015d10d642861a104990d9fbe123a");
                }}
                className="text-[9px] mono text-slate-400 border border-slate-700 px-2 py-1 rounded hover:bg-slate-800"
              >
                {u.role}
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
