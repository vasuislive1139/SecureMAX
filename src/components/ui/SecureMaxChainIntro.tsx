'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { Shield, ArrowRight } from 'lucide-react';

interface SecureMaxChainIntroProps {
  onComplete?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================
// CHAIN LINK RENDERER — Realistic interlocking metal chain
// ============================================================

interface ChainLink {
  x: number;
  y: number;
  angle: number;
  isVertical: boolean; // alternates: flat vs upright
  alpha: number;
  meltProgress: number; // 0 = solid, 1 = fully melted
}

interface Particle {
  x: number; y: number;
  tx: number; ty: number; // target
  vx: number; vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  delay: number;
}

// Easing
function easeInOutCubic(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
function easeInQuart(t: number) { return t * t * t * t; }
function easeOutBack(t: number) { const c = 2.70158; return 1 + (c+1)*Math.pow(t-1,3) + c*Math.pow(t-1,2); }
function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b-a) * t; }

// Draw a single chain link (capsule/stadium shape)
function drawLink(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  angle: number,
  alpha: number,
  melt: number,
) {
  if (alpha < 0.005) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha * (1 - melt * 0.8);

  const r = h / 2;
  const thick = 5;

  // Distort slightly when melting
  const wobble = melt > 0 ? Math.sin(Date.now() * 0.01 + x) * melt * 3 : 0;
  const scaleY = 1 + melt * 0.3;

  ctx.scale(1, scaleY);

  // Main link outline (rounded rectangle / stadium)
  ctx.beginPath();
  ctx.moveTo(-w + r, -h + wobble);
  ctx.lineTo(w - r, -h - wobble);
  ctx.arc(w - r, wobble, h, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(-w + r, h + wobble);
  ctx.arc(-w + r, wobble, h, Math.PI / 2, -Math.PI / 2);
  ctx.closePath();

  // Metallic gradient (top-to-bottom for 3D cylinder look)
  const grad = ctx.createLinearGradient(0, -h - 4, 0, h + 4);
  // Chrome/silver palette
  grad.addColorStop(0, '#e2e8f0');    // bright top edge
  grad.addColorStop(0.15, '#cbd5e1');  // light shoulder
  grad.addColorStop(0.4, '#64748b');   // mid shadow
  grad.addColorStop(0.5, '#475569');   // core shadow
  grad.addColorStop(0.6, '#64748b');   // bottom bounce
  grad.addColorStop(0.85, '#94a3b8');  // bottom shoulder
  grad.addColorStop(1, '#cbd5e1');     // bottom edge

  ctx.strokeStyle = grad;
  ctx.lineWidth = thick;
  ctx.stroke();

  // Specular highlight (thin bright line near top)
  ctx.beginPath();
  ctx.moveTo(-w + r + 4, -h + 2 + wobble);
  ctx.lineTo(w - r - 4, -h + 2 - wobble);
  ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - melt)})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Bottom edge shadow
  ctx.beginPath();
  ctx.moveTo(-w + r + 4, h - 1.5 + wobble);
  ctx.lineTo(w - r - 4, h - 1.5 + wobble);
  ctx.strokeStyle = `rgba(0,0,0,${0.35 * (1 - melt)})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Melt glow
  if (melt > 0.1) {
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.6, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.6);
    g.addColorStop(0, `rgba(34,211,238,${melt * 0.5})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fill();
  }

  ctx.restore();
}

// Generate chain link positions
function generateChain(
  count: number,
  startX: number,
  centerX: number,
  centerY: number,
  slideProgress: number,     // 0→1 how far the chain has slid in
  direction: 'left' | 'right',
  linkW: number,
  linkH: number,
): ChainLink[] {
  const links: ChainLink[] = [];
  const spacing = linkW * 1.75;

  for (let i = 0; i < count; i++) {
    const isVertical = i % 2 === 1;

    // Chain starts off-screen, slides toward center
    const chainEnd = direction === 'left' ? centerX - 40 : centerX + 40;
    const restX = direction === 'left'
      ? chainEnd - (count - 1 - i) * spacing
      : chainEnd + (count - 1 - i) * spacing;

    const offscreenX = direction === 'left'
      ? restX - startX
      : restX + startX;

    const eased = easeOutQuart(slideProgress);
    const x = lerp(offscreenX, restX, eased);

    // Slight vertical wave for organic feel
    const wave = Math.sin(i * 0.8 + slideProgress * 4) * 3 * (1 - slideProgress * 0.5);

    links.push({
      x,
      y: centerY + wave,
      angle: isVertical ? Math.PI / 2 : 0,
      isVertical,
      alpha: clamp(slideProgress * 3 - (i / count) * 0.5),
      meltProgress: 0,
    });
  }

  return links;
}

export default function SecureMaxChainIntro({ onComplete, isOpen, onClose }: SecureMaxChainIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const spawnedRef = useRef(false);
  const stageRef = useRef(0);

  const dismiss = useCallback(() => {
    if (onComplete) onComplete();
    onClose();
  }, [onComplete, onClose]);

  useEffect(() => {
    if (!isOpen) {
      stageRef.current = 0;
      spawnedRef.current = false;
      particlesRef.current = [];
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    // Reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stageRef.current = 5;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W: number, H: number;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    startRef.current = 0;
    spawnedRef.current = false;
    particlesRef.current = [];

    // Chain config
    const LINK_COUNT = 12;
    const LINK_W = 18;
    const LINK_H = 8;

    // Timeline (seconds)
    const T = {
      darkIn:    [0.0, 0.8],
      slideIn:   [0.6, 2.4],
      hold:      [2.4, 3.0],
      melt:      [3.0, 4.2],
      lockIn:    [4.0, 5.2],
      final:     [5.2, 6.0],
      autoDone:  7.0,
    };

    function phaseProg(t: number, phase: number[]): number {
      return clamp((t - phase[0]) / (phase[1] - phase[0]));
    }

    // Spawn particles from chain positions
    function spawnParticles(links: ChainLink[]) {
      const pts: Particle[] = [];
      const cx = W / 2, cy = H / 2;
      for (const link of links) {
        const count = 6 + Math.floor(Math.random() * 4);
        for (let j = 0; j < count; j++) {
          const isCyan = Math.random() > 0.4;
          pts.push({
            x: link.x + (Math.random() - 0.5) * LINK_W * 2,
            y: link.y + (Math.random() - 0.5) * LINK_H * 2,
            tx: cx + (Math.random() - 0.5) * 30,
            ty: cy + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: 1.5 + Math.random() * 2.5,
            alpha: 0.8 + Math.random() * 0.2,
            color: isCyan ? '#22d3ee' : '#cbd5e1',
            life: 0,
            maxLife: 0.6 + Math.random() * 0.6,
            delay: Math.random() * 0.5,
          });
        }
      }
      particlesRef.current = pts;
    }

    // Draw subtle grid
    function drawGrid(alpha: number) {
      if (alpha < 0.005) return;
      ctx.save();
      ctx.globalAlpha = alpha * 0.04;
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 0.5;
      const step = 50;
      for (let x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.restore();
    }

    // Draw lock icon
    function drawLock(cx: number, cy: number, scale: number, alpha: number) {
      if (alpha < 0.005) return;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      // HUD ring
      ctx.beginPath();
      ctx.arc(0, 8, 55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34,211,238,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Shackle
      ctx.beginPath();
      ctx.arc(0, -10, 18, Math.PI, 0);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Body
      const bw = 46, bh = 38, br = 8;
      ctx.beginPath();
      ctx.moveTo(-bw/2 + br, 4);
      ctx.lineTo(bw/2 - br, 4);
      ctx.arcTo(bw/2, 4, bw/2, 4 + br, br);
      ctx.lineTo(bw/2, 4 + bh - br);
      ctx.arcTo(bw/2, 4 + bh, bw/2 - br, 4 + bh, br);
      ctx.lineTo(-bw/2 + br, 4 + bh);
      ctx.arcTo(-bw/2, 4 + bh, -bw/2, 4 + bh - br, br);
      ctx.lineTo(-bw/2, 4 + br);
      ctx.arcTo(-bw/2, 4, -bw/2 + br, 4, br);
      ctx.closePath();

      const bodyGrad = ctx.createLinearGradient(0, 4, 0, 4 + bh);
      bodyGrad.addColorStop(0, 'rgba(10,20,35,0.95)');
      bodyGrad.addColorStop(1, 'rgba(5,10,18,0.98)');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 20;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner border
      ctx.beginPath();
      ctx.roundRect(-bw/2 + 4, 8, bw - 8, bh - 8, 5);
      ctx.strokeStyle = 'rgba(34,211,238,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Hexagonal shield
      const hexR = 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const hx = Math.cos(a) * hexR;
        const hy = 17 + Math.sin(a) * hexR;
        i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(34,211,238,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(34,211,238,0.1)';
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(0, 17, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Keyhole
      ctx.beginPath();
      ctx.moveTo(-2, 24);
      ctx.lineTo(2, 24);
      ctx.lineTo(1.5, 32);
      ctx.lineTo(-1.5, 32);
      ctx.closePath();
      ctx.fillStyle = '#22d3ee';
      ctx.fill();

      ctx.restore();
    }

    // Main loop
    function frame(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;

      // Clear
      ctx.fillStyle = '#030508';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;

      // Phase progress
      const pDark = phaseProg(elapsed, T.darkIn);
      const pSlide = phaseProg(elapsed, T.slideIn);
      const pMelt = phaseProg(elapsed, T.melt);
      const pLock = phaseProg(elapsed, T.lockIn);
      const pFinal = phaseProg(elapsed, T.final);

      // Grid
      drawGrid(easeOutQuart(pDark));

      // Generate chains
      const leftChain = generateChain(LINK_COUNT, W * 0.8, cx, cy, pSlide, 'left', LINK_W, LINK_H);
      const rightChain = generateChain(LINK_COUNT, W * 0.8, cx, cy, pSlide, 'right', LINK_W, LINK_H);

      // Apply melt
      const allLinks = [...leftChain, ...rightChain];
      if (pMelt > 0) {
        for (let i = 0; i < allLinks.length; i++) {
          // Stagger melt from center outward
          const link = allLinks[i];
          const distFromCenter = Math.abs(link.x - cx) / (W * 0.4);
          const meltDelay = distFromCenter * 0.4;
          link.meltProgress = clamp((pMelt - meltDelay) * 2);
        }
      }

      // Spawn particles at melt start
      if (pMelt > 0.05 && !spawnedRef.current) {
        spawnedRef.current = true;
        spawnParticles(allLinks);
      }

      // Draw chains (back links first, then front)
      if (pSlide > 0 && pMelt < 1) {
        // Sort: draw vertical (back) links first, then horizontal (front)
        const backLinks = allLinks.filter(l => l.isVertical);
        const frontLinks = allLinks.filter(l => !l.isVertical);

        for (const link of backLinks) {
          if (link.meltProgress < 0.95) {
            drawLink(ctx, link.x, link.y, LINK_W, LINK_H, link.angle, link.alpha, link.meltProgress);
          }
        }
        for (const link of frontLinks) {
          if (link.meltProgress < 0.95) {
            drawLink(ctx, link.x, link.y, LINK_W, LINK_H, link.angle, link.alpha, link.meltProgress);
          }
        }
      }

      // Draw particles
      if (particlesRef.current.length > 0 && pMelt > 0) {
        const meltEased = easeInOutCubic(pMelt);
        for (const p of particlesRef.current) {
          const t = clamp((meltEased - p.delay) / (1 - p.delay));
          const et = easeInQuart(t);

          const px = lerp(p.x, p.tx, et) + Math.sin(t * 8 + p.x) * 2 * (1 - et);
          const py = lerp(p.y, p.ty, et) + Math.cos(t * 6 + p.y) * 2 * (1 - et);
          const a = p.alpha * (1 - et * 0.7);
          const s = p.size * (1 - et * 0.4);

          if (a < 0.01 || s < 0.2) continue;

          // Glow
          ctx.beginPath();
          ctx.arc(px, py, s * 3, 0, Math.PI * 2);
          const glow = ctx.createRadialGradient(px, py, 0, px, py, s * 3);
          const isC = p.color === '#22d3ee';
          glow.addColorStop(0, isC ? `rgba(34,211,238,${a * 0.35})` : `rgba(203,213,225,${a * 0.2})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fill();

          // Dot
          ctx.beginPath();
          ctx.arc(px, py, s, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = a;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Pulse ring at melt peak
      if (pMelt > 0.4 && pMelt < 0.9) {
        const ringProgress = (pMelt - 0.4) / 0.5;
        const ringRadius = ringProgress * Math.min(W, H) * 0.25;
        const ringAlpha = (1 - ringProgress) * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.globalAlpha = ringAlpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Lock
      if (pLock > 0) {
        const lockScale = easeOutBack(clamp(pLock));
        const lockAlpha = easeOutQuart(clamp(pLock * 1.3));
        drawLock(cx, cy, lerp(0.3, 1, lockScale), lockAlpha);
      }

      // Update stage for DOM
      if (pFinal > 0 && stageRef.current < 5) stageRef.current = 5;
      else if (pLock > 0.3 && stageRef.current < 4) stageRef.current = 4;
      else if (pMelt > 0 && stageRef.current < 3) stageRef.current = 3;
      else if (pSlide > 0 && stageRef.current < 2) stageRef.current = 2;
      else if (pDark > 0 && stageRef.current < 1) stageRef.current = 1;

      // Force DOM updates for text overlays
      const wordEl = document.getElementById('sm-wordmark');
      const bannerEl = document.getElementById('sm-banner');
      const btnEl = document.getElementById('sm-enter-btn');

      if (wordEl) {
        const wordAlpha = pSlide > 0 ? easeOutQuart(pSlide) : easeOutQuart(pDark * 2);
        const wordFade = pMelt > 0.3 ? 1 - easeInQuart(clamp((pMelt - 0.3) / 0.5)) : 1;
        const wordReappear = pFinal > 0 ? easeOutQuart(pFinal) : 0;
        const finalAlpha = Math.max(wordAlpha * wordFade, wordReappear);
        wordEl.style.opacity = String(finalAlpha);
        if (pFinal > 0) {
          wordEl.style.transform = `translateY(-50px) scale(0.7)`;
        } else {
          wordEl.style.transform = `scale(1)`;
        }
      }

      if (bannerEl) {
        bannerEl.style.opacity = String(pFinal > 0 ? easeOutQuart(pFinal) : 0);
        bannerEl.style.transform = pFinal > 0 ? `translateY(0) scale(1)` : `translateY(20px) scale(0.9)`;
      }

      if (btnEl) {
        btnEl.style.opacity = String(pFinal > 0.3 ? easeOutQuart(clamp((pFinal - 0.3) / 0.7)) : 0);
      }

      // Auto-dismiss
      if (elapsed > T.autoDone) {
        dismiss();
        return;
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030508] flex flex-col items-center justify-center select-none overflow-hidden">

      {/* Canvas layer for chains + lock */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* Wordmark */}
      <div
        id="sm-wordmark"
        className="relative z-10 text-center opacity-0 transition-none"
      >
        <div className="text-[10px] font-mono tracking-[0.45em] text-cyan-400/80 uppercase font-bold mb-2 flex items-center justify-center gap-2">
          <span className="w-6 h-px bg-cyan-400/50" />
          ZERO-TRUST FORTRESS
          <span className="w-6 h-px bg-cyan-400/50" />
        </div>
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white uppercase">
          SECURE<span className="text-cyan-400">MAX</span>
        </h1>
        <div className="text-[10px] font-mono text-zinc-500 tracking-[0.3em] uppercase mt-2">
          PEOPLE • DATA • TRUST • SIH 2026
        </div>
      </div>

      {/* Bottom banner */}
      <div
        id="sm-banner"
        className="absolute bottom-8 z-10 flex flex-col items-center text-center opacity-0 transition-none"
      >
        <div className="px-5 py-2.5 rounded-2xl border border-cyan-400/70 bg-[#06101e]/90 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-400/60 flex items-center justify-center">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-left">
            <div className="text-[11px] sm:text-xs font-black tracking-wide text-white uppercase flex items-center gap-2">
              ZERO-TRUST SECURITY ENCLAVE ARMED
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            </div>
            <div className="text-[9px] font-mono text-cyan-400/80 tracking-wider">
              DUAL-CHAIN VALIDATED • DEVICE PASSPORT • KMS LOCKED
            </div>
          </div>
        </div>

        <button
          id="sm-enter-btn"
          type="button"
          onClick={dismiss}
          className="mt-3 px-5 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-mono font-bold text-[11px] tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer transition-all flex items-center gap-2 active:scale-95 opacity-0"
        >
          ENTER SECURE VAULT
          <ArrowRight className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>

      {/* Skip */}
      <button
        type="button"
        onClick={dismiss}
        className="fixed top-5 right-5 z-50 px-3 py-1.5 rounded-lg bg-zinc-900/70 border border-zinc-700/50 text-[10px] font-mono text-zinc-400 hover:text-white hover:border-cyan-500/40 transition-all cursor-pointer tracking-wider uppercase"
      >
        Skip ›
      </button>

    </div>
  );
}
