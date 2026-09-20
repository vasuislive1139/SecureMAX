'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Sparkles, Volume2, VolumeX, ArrowRight, X } from 'lucide-react';

interface SecureMaxChainIntroProps {
  onComplete?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SecureMaxChainIntro({ onComplete, isOpen, onClose }: SecureMaxChainIntroProps) {
  const [stage, setStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound Synthesizer via Web Audio API
  const playSound = (type: 'whoosh' | 'chain' | 'lock') => {
    if (!sfxEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.45);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'chain') {
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220 + i * 120, now + i * 0.08);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.3 + i * 0.08);
          gain.gain.setValueAtTime(0.2, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35 + i * 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + 0.4 + i * 0.08);
        }
      } else if (type === 'lock') {
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const gain = ctx.createGain();
        const subGain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        sub.type = 'sine';
        sub.frequency.setValueAtTime(110, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        subGain.gain.setValueAtTime(0.5, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        sub.connect(subGain);
        subGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
        sub.start(now);
        sub.stop(now + 0.5);
      }
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }

    setStage(0);

    // Timeline:
    // 0.3s -> Stage 1 (Title Surge)
    const t1 = setTimeout(() => {
      setStage(1);
      playSound('whoosh');
    }, 300);

    // 1.2s -> Stage 2 (Dual Chains Inward from Left and Right)
    const t2 = setTimeout(() => {
      setStage(2);
      playSound('chain');
    }, 1200);

    // 2.1s -> Stage 3 (Master Lock Drops)
    const t3 = setTimeout(() => {
      setStage(3);
    }, 2100);

    // 2.7s -> Shackle Snaps
    const t4 = setTimeout(() => {
      playSound('lock');
    }, 2700);

    // 3.2s -> Stage 4 (Security Sign Armed)
    const t5 = setTimeout(() => {
      setStage(4);
    }, 3200);

    // 4.8s -> Auto dismiss
    const t6 = setTimeout(() => {
      if (onComplete) onComplete();
      onClose();
    }, 5200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05070c] flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      
      {/* Background Cyber Grid */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          perspective: '500px',
          transform: 'rotateX(55deg) translateY(-80px)',
          animation: 'pulse 5s ease-in-out infinite'
        }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-[#05070c]/70 to-[#05070c] pointer-events-none" />

      {/* Top Controls Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#06b6d4] animate-pulse" />
          <span className="text-[11px] font-mono tracking-widest text-cyan-300 font-bold uppercase">
            SECUREMAX CYBER ENCLAVE // LAUNCH
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSfxEnabled(!sfxEnabled)}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={sfxEnabled ? "Mute SFX" : "Unmute SFX"}
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onComplete) onComplete();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Skip</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Dynamic Stage Viewport */}
      <div className="relative w-full max-w-5xl h-[520px] flex items-center justify-center">
        
        {/* Shockwave Ring (Triggers on lock snap) */}
        {stage >= 3 && (
          <div 
            className="absolute w-56 h-56 rounded-full border-4 border-cyan-400 pointer-events-none z-40 animate-ping opacity-75"
            style={{ animationDuration: '0.8s' }}
          />
        )}

        {/* ============================================================== */}
        {/* 1. TITLE: SECUREMAX IN CENTRE                                  */}
        {/* ============================================================== */}
        <div 
          className={`relative z-10 flex flex-col items-center justify-center text-center transition-all duration-700 ${
            stage >= 1 
              ? 'opacity-100 scale-100 filter-none' 
              : 'opacity-0 scale-50 blur-xl'
          }`}
        >
          <div className="text-[11px] font-mono tracking-[0.45em] text-cyan-400 uppercase font-bold mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.9)] flex items-center gap-2">
            <span className="w-8 h-px bg-cyan-400" />
            ZERO-TRUST FORTRESS
            <span className="w-8 h-px bg-cyan-400" />
          </div>

          <h1 className="text-6xl sm:text-8xl font-black tracking-tight text-white uppercase drop-shadow-[0_0_50px_rgba(6,182,212,0.6)]">
            SECURE<span className="text-cyan-400 drop-shadow-[0_0_30px_#06b6d4]">MAX</span>
          </h1>

          <div className="text-xs font-mono text-zinc-400 tracking-[0.3em] uppercase mt-2">
            PEOPLE • DATA • TRUST • SIH 2026
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. DUAL CHAINS FROM BEHIND (LEFT & RIGHT)                      */}
        {/* ============================================================== */}
        
        {/* Left Chain */}
        <div 
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-900 ease-out ${
            stage >= 2 
              ? 'translate-x-0 opacity-100 rotate-0 scale-100' 
              : '-translate-x-[120%] opacity-0 -rotate-45 scale-50'
          }`}
        >
          <svg width="520" height="140" viewBox="0 0 520 140" fill="none" className="drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <defs>
              <linearGradient id="metalVertL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8d6e5"/>
                <stop offset="30%" stopColor="#8395a7"/>
                <stop offset="50%" stopColor="#576574"/>
                <stop offset="70%" stopColor="#8395a7"/>
                <stop offset="100%" stopColor="#dfe6e9"/>
              </linearGradient>
              <linearGradient id="metalHorizL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dfe6e9"/>
                <stop offset="25%" stopColor="#a4b0be"/>
                <stop offset="50%" stopColor="#576574"/>
                <stop offset="75%" stopColor="#a4b0be"/>
                <stop offset="100%" stopColor="#c8d6e5"/>
              </linearGradient>
              <linearGradient id="highlightL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </linearGradient>
            </defs>
            {/* Layer 1: Back halves of horizontal (flat) links */}
            <g stroke="url(#metalHorizL)" strokeWidth="8" fill="none" strokeLinecap="round">
              <path d="M 8,70 A 30,16 0 0,1 68,70" />
              <path d="M 72,70 A 30,16 0 0,1 132,70" />
              <path d="M 136,70 A 30,16 0 0,1 196,70" />
              <path d="M 200,70 A 30,16 0 0,1 260,70" />
              <path d="M 264,70 A 30,16 0 0,1 324,70" />
              <path d="M 328,70 A 30,16 0 0,1 388,70" />
              <path d="M 392,70 A 30,16 0 0,1 452,70" />
              <path d="M 456,70 A 30,16 0 0,1 516,70" />
            </g>
            {/* Layer 2: Vertical (upright) connector links */}
            <g stroke="url(#metalVertL)" strokeWidth="8" fill="none" strokeLinecap="round">
              <ellipse cx="38" cy="70" rx="10" ry="26"/>
              <ellipse cx="102" cy="70" rx="10" ry="26"/>
              <ellipse cx="166" cy="70" rx="10" ry="26"/>
              <ellipse cx="230" cy="70" rx="10" ry="26"/>
              <ellipse cx="294" cy="70" rx="10" ry="26"/>
              <ellipse cx="358" cy="70" rx="10" ry="26"/>
              <ellipse cx="422" cy="70" rx="10" ry="26"/>
              <ellipse cx="486" cy="70" rx="10" ry="26"/>
            </g>
            {/* Layer 3: Front halves of horizontal (flat) links */}
            <g stroke="url(#metalHorizL)" strokeWidth="8" fill="none" strokeLinecap="round">
              <path d="M 8,70 A 30,16 0 0,0 68,70" />
              <path d="M 72,70 A 30,16 0 0,0 132,70" />
              <path d="M 136,70 A 30,16 0 0,0 196,70" />
              <path d="M 200,70 A 30,16 0 0,0 260,70" />
              <path d="M 264,70 A 30,16 0 0,0 324,70" />
              <path d="M 328,70 A 30,16 0 0,0 388,70" />
              <path d="M 392,70 A 30,16 0 0,0 452,70" />
              <path d="M 456,70 A 30,16 0 0,0 516,70" />
            </g>
            {/* Specular highlight line */}
            <line x1="20" y1="55" x2="500" y2="55" stroke="url(#highlightL)" strokeWidth="1.5" opacity="0.6"/>
          </svg>
        </div>

        {/* Right Chain */}
        <div 
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-900 ease-out ${
            stage >= 2 
              ? 'translate-x-0 opacity-100 rotate-0 scale-100' 
              : 'translate-x-[120%] opacity-0 rotate-45 scale-50'
          }`}
        >
          <svg width="520" height="140" viewBox="0 0 520 140" fill="none" className="drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
            <defs>
              <linearGradient id="metalVertR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c8d6e5"/>
                <stop offset="30%" stopColor="#8395a7"/>
                <stop offset="50%" stopColor="#576574"/>
                <stop offset="70%" stopColor="#8395a7"/>
                <stop offset="100%" stopColor="#dfe6e9"/>
              </linearGradient>
              <linearGradient id="metalHorizR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#dfe6e9"/>
                <stop offset="25%" stopColor="#a4b0be"/>
                <stop offset="50%" stopColor="#576574"/>
                <stop offset="75%" stopColor="#a4b0be"/>
                <stop offset="100%" stopColor="#c8d6e5"/>
              </linearGradient>
              <linearGradient id="highlightR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </linearGradient>
            </defs>
            {/* Layer 1: Back halves of horizontal (flat) links */}
            <g stroke="url(#metalHorizR)" strokeWidth="8" fill="none" strokeLinecap="round">
              <path d="M 8,70 A 30,16 0 0,1 68,70" />
              <path d="M 72,70 A 30,16 0 0,1 132,70" />
              <path d="M 136,70 A 30,16 0 0,1 196,70" />
              <path d="M 200,70 A 30,16 0 0,1 260,70" />
              <path d="M 264,70 A 30,16 0 0,1 324,70" />
              <path d="M 328,70 A 30,16 0 0,1 388,70" />
              <path d="M 392,70 A 30,16 0 0,1 452,70" />
              <path d="M 456,70 A 30,16 0 0,1 516,70" />
            </g>
            {/* Layer 2: Vertical (upright) connector links */}
            <g stroke="url(#metalVertR)" strokeWidth="8" fill="none" strokeLinecap="round">
              <ellipse cx="38" cy="70" rx="10" ry="26"/>
              <ellipse cx="102" cy="70" rx="10" ry="26"/>
              <ellipse cx="166" cy="70" rx="10" ry="26"/>
              <ellipse cx="230" cy="70" rx="10" ry="26"/>
              <ellipse cx="294" cy="70" rx="10" ry="26"/>
              <ellipse cx="358" cy="70" rx="10" ry="26"/>
              <ellipse cx="422" cy="70" rx="10" ry="26"/>
              <ellipse cx="486" cy="70" rx="10" ry="26"/>
            </g>
            {/* Layer 3: Front halves of horizontal (flat) links */}
            <g stroke="url(#metalHorizR)" strokeWidth="8" fill="none" strokeLinecap="round">
              <path d="M 8,70 A 30,16 0 0,0 68,70" />
              <path d="M 72,70 A 30,16 0 0,0 132,70" />
              <path d="M 136,70 A 30,16 0 0,0 196,70" />
              <path d="M 200,70 A 30,16 0 0,0 260,70" />
              <path d="M 264,70 A 30,16 0 0,0 324,70" />
              <path d="M 328,70 A 30,16 0 0,0 388,70" />
              <path d="M 392,70 A 30,16 0 0,0 452,70" />
              <path d="M 456,70 A 30,16 0 0,0 516,70" />
            </g>
            {/* Specular highlight line */}
            <line x1="20" y1="55" x2="500" y2="55" stroke="url(#highlightR)" strokeWidth="1.5" opacity="0.6"/>
          </svg>
        </div>

        {/* ============================================================== */}
        {/* 3. MASTER PADLOCK & SECURITY SIGN                              */}
        {/* ============================================================== */}
        <div 
          className={`absolute z-30 flex flex-col items-center justify-center transition-all duration-600 ease-out ${
            stage >= 3 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-28 scale-50'
          }`}
          style={{ filter: 'drop-shadow(0 0 35px rgba(6,182,212,0.7))' }}
        >
          {/* Shackle with Snap Animation */}
          <div 
            className={`relative w-28 h-24 border-[12px] border-cyan-400 rounded-t-full border-b-0 -mb-4 shadow-[0_0_25px_#06b6d4] transition-transform duration-200 ${
              stage >= 3 ? 'translate-y-0' : '-translate-y-6'
            }`}
          >
            <div className="absolute -left-3 bottom-0 w-3 h-5 bg-cyan-300 rounded-sm" />
            <div className="absolute -right-3 bottom-0 w-3 h-5 bg-cyan-300 rounded-sm" />
          </div>

          {/* Heavy Lock Body */}
          <div className="relative w-44 h-40 bg-gradient-to-b from-[#0e1726] via-[#09101c] to-[#04070d] border-2 border-cyan-400 rounded-2xl p-4 flex flex-col items-center justify-between shadow-[0_0_45px_rgba(6,182,212,0.4)]">
            <div className="absolute inset-1.5 rounded-xl border border-cyan-500/30 bg-zinc-950/70 pointer-events-none" />

            {/* Hexagonal Shield Hologram */}
            <div className="relative z-10 mt-1">
              <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
                <polygon points="22,3 40,13 40,31 22,41 4,31 4,13" stroke="#06b6d4" strokeWidth="2.5" fill="rgba(6,182,212,0.2)"/>
                <circle cx="22" cy="22" r="7" fill="#06b6d4" className="animate-pulse" />
              </svg>
            </div>

            {/* Keyhole & Security Text */}
            <div className="relative z-10 flex flex-col items-center -mt-1">
              <div className="w-4 h-7 bg-cyan-400 rounded-full shadow-[0_0_15px_#06b6d4] flex flex-col items-center justify-end pb-0.5">
                <div className="w-2 h-2.5 bg-black rounded-full" />
              </div>
              <span className="text-[9px] font-mono text-cyan-300 font-bold tracking-widest uppercase mt-2">
                AES-256-GCM LOCKED
              </span>
            </div>

            {/* Corner Rivets */}
            <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. GLOWING SECURITY SIGN BANNER                                */}
        {/* ============================================================== */}
        <div 
          className={`absolute bottom-6 z-40 flex flex-col items-center text-center transition-all duration-700 ease-out ${
            stage >= 4 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-90'
          }`}
        >
          <div className="px-6 py-3 rounded-2xl border border-cyan-400/80 bg-[#06101e]/95 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.55)] flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left">
              <div className="text-xs sm:text-sm font-black tracking-wide text-white uppercase flex items-center gap-2">
                <span>ZERO-TRUST SECURITY ENCLAVE ARMED</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
              <div className="text-[10px] font-mono text-cyan-400 tracking-wider">
                DUAL-CHAIN VALIDATED • DEVICE PASSPORT ACTIVE • SERVER-SIDE KMS LOCKED
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onComplete) onComplete();
              onClose();
            }}
            className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-mono font-bold text-xs tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.45)] cursor-pointer transition-all flex items-center gap-2 active:scale-95"
          >
            <span>ENTER SECURE VAULT</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

      </div>

    </div>
  );
}
