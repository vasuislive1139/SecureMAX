import React, { useEffect, useRef, useCallback } from "react";

interface BlockchainHeroAnimationProps {
  onComplete: () => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ─── types ───────────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  pulse: number;
}

interface ChainLink {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  depth: number;
  hasNode: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const BlockchainHeroAnimation: React.FC<BlockchainHeroAnimationProps> = ({
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const doneRef = useRef(false);

  // Total animation duration: 5.5 s
  const TOTAL_DURATION = 5500;

  // Phase timing (ms)
  const P_ENV_END       = 400;   // environment fades in
  const P_TITLE_START   = 350;
  const P_TITLE_END     = 1200;  // title appears
  const P_LOCK_START    = 900;
  const P_LOCK_END      = 1800;  // lock begins forming
  const P_CHAIN_START   = 1500;  // chains emerge
  const P_CHAIN_OUT     = 2600;  // chains reach sides
  const P_CHAIN_BACK    = 3800;  // chains curve back
  const P_GRAB_START    = 3600;
  const P_GRAB_END      = 4600;  // chains grab lock
  const P_GLOW_END      = 5200;  // final glow
  const P_FADE_OUT      = 5000;  // start fading

  const initParticles = useCallback((w: number, h: number) => {
    const arr: Particle[] = [];
    for (let i = 0; i < 70; i++) {
      arr.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.4 + 0.05,
        pulse: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = arr;
  }, []);

  // ─── draw helpers ─────────────────────────────────────────────────────────

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha * 0.07;
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 0.5;
    const step = 60;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, globalAlpha: number) => {
    const particles = particlesRef.current;
    ctx.save();
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      const pulse = Math.sin(time * 0.002 + p.pulse) * 0.3 + 0.7;
      ctx.globalAlpha = p.alpha * pulse * globalAlpha;
      ctx.fillStyle = "#00e5ff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  };

  const drawAtmosphericGlow = (ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number) => {
    ctx.save();
    // Top-center glow
    const g1 = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.5);
    g1.addColorStop(0, `rgba(0,150,200,${0.06 * alpha})`);
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Bottom glow
    const g2 = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.6);
    g2.addColorStop(0, `rgba(0,80,120,${0.05 * alpha})`);
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  // ─── 3-D Chain Link ───────────────────────────────────────────────────────
  // Draws a single oval chain link with 3D shading and cyan rim light.
  const drawChainLink = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    rx: number,     // half-width of link
    ry: number,     // half-height of link
    thickness: number,
    alpha: number,
    hasNode: boolean,
    time: number
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow
    ctx.shadowColor = "rgba(0,200,230,0.3)";
    ctx.shadowBlur = 10;

    // Outer ellipse (dark metallic body)
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, 0, 0, 0, rx * 1.2);
    bodyGrad.addColorStop(0, "#1a2a35");
    bodyGrad.addColorStop(0.5, "#0d1a22");
    bodyGrad.addColorStop(1, "#050e14");
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Cyan rim light (stroke)
    ctx.strokeStyle = `rgba(0,220,255,0.9)`;
    ctx.lineWidth = thickness * 0.6;
    ctx.stroke();

    // Inner cutout
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - thickness, ry - thickness, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,180,220,0.3)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Highlight reflection
    ctx.beginPath();
    ctx.ellipse(-rx * 0.2, -ry * 0.35, rx * 0.35, ry * 0.15, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();

    // Blockchain node indicator
    if (hasNode) {
      const nodeGlow = Math.sin(time * 0.004 + x * 0.01) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, thickness * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,220,255,${0.6 * nodeGlow})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, thickness * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,255,255,${0.9 * nodeGlow})`;
      ctx.fill();
    }

    ctx.restore();
  };

  // ─── Big Padlock ──────────────────────────────────────────────────────────
  const drawLock = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    alpha: number,
    glowIntensity: number,
    time: number
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const bW = 110; // body width
    const bH = 90;  // body height
    const bR = 18;  // corner radius
    const shackleW = 55;
    const shackleH = 55;
    const shackleThick = 14;

    // Outer glow
    const pulse = Math.sin(time * 0.002) * 0.3 + 0.7;
    ctx.shadowColor = `rgba(0,200,255,${0.5 * glowIntensity * pulse})`;
    ctx.shadowBlur = 40 * glowIntensity;

    // ── Shackle (U-bar) ──
    ctx.beginPath();
    ctx.arc(0, -bH / 2 - shackleH * 0.5, shackleW / 2, Math.PI, 0);
    ctx.lineWidth = shackleThick;
    const shackleGrad = ctx.createLinearGradient(-shackleW / 2, -bH / 2 - shackleH, shackleW / 2, -bH / 2);
    shackleGrad.addColorStop(0, "#0d2030");
    shackleGrad.addColorStop(0.4, "#1a3a50");
    shackleGrad.addColorStop(1, "#0a1820");
    ctx.strokeStyle = shackleGrad;
    ctx.stroke();

    // Shackle rim light
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -bH / 2 - shackleH * 0.5, shackleW / 2, Math.PI, 0);
    ctx.strokeStyle = `rgba(0,220,255,${0.85 * glowIntensity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowColor = `rgba(0,200,255,${0.4 * glowIntensity})`;
    ctx.shadowBlur = 15 * glowIntensity;

    // Shackle legs
    ctx.beginPath();
    ctx.moveTo(-shackleW / 2, -bH / 2 - shackleH * 0.5);
    ctx.lineTo(-shackleW / 2, -bH / 2 + 8);
    ctx.strokeStyle = "rgba(0,200,255,0.7)";
    ctx.lineWidth = shackleThick;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(shackleW / 2, -bH / 2 - shackleH * 0.5);
    ctx.lineTo(shackleW / 2, -bH / 2 + 8);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // ── Body ──
    const bodyPath = new Path2D();
    bodyPath.moveTo(-bW / 2 + bR, -bH / 2);
    bodyPath.arcTo(bW / 2, -bH / 2, bW / 2, bH / 2, bR);
    bodyPath.arcTo(bW / 2, bH / 2, -bW / 2, bH / 2, bR);
    bodyPath.arcTo(-bW / 2, bH / 2, -bW / 2, -bH / 2, bR);
    bodyPath.arcTo(-bW / 2, -bH / 2, bW / 2, -bH / 2, bR);
    bodyPath.closePath();

    // Body — deep metallic fill
    const bodyGrad = ctx.createLinearGradient(-bW / 2, -bH / 2, bW / 2, bH / 2);
    bodyGrad.addColorStop(0, "#0f2233");
    bodyGrad.addColorStop(0.3, "#172d40");
    bodyGrad.addColorStop(0.6, "#0d1f2e");
    bodyGrad.addColorStop(1, "#07111a");
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = `rgba(0,150,200,${0.25 * glowIntensity})`;
    ctx.shadowBlur = 25;
    ctx.fill(bodyPath);

    // Body — cyan border
    ctx.strokeStyle = `rgba(0,220,255,${0.9 * glowIntensity})`;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = `rgba(0,220,255,${0.7 * glowIntensity})`;
    ctx.shadowBlur = 12 * glowIntensity;
    ctx.stroke(bodyPath);

    // Body — top reflection stripe
    ctx.save();
    ctx.clip(bodyPath);
    const refGrad = ctx.createLinearGradient(-bW / 2, -bH / 2, bW / 2, -bH / 2 + 25);
    refGrad.addColorStop(0, "rgba(255,255,255,0.0)");
    refGrad.addColorStop(0.4, "rgba(255,255,255,0.07)");
    refGrad.addColorStop(1, "rgba(255,255,255,0.0)");
    ctx.fillStyle = refGrad;
    ctx.fillRect(-bW / 2, -bH / 2, bW, 25);
    ctx.restore();

    // Internal glow
    ctx.save();
    ctx.clip(bodyPath);
    const innerGlow = ctx.createRadialGradient(0, 10, 0, 0, 10, bW * 0.7);
    innerGlow.addColorStop(0, `rgba(0,180,220,${0.1 * glowIntensity})`);
    innerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = innerGlow;
    ctx.fillRect(-bW / 2, -bH / 2, bW, bH);
    ctx.restore();

    // ── Keyhole ──
    ctx.shadowBlur = 0;
    // Circle
    ctx.beginPath();
    ctx.arc(0, 5, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#020a10";
    ctx.fill();
    ctx.strokeStyle = `rgba(0,200,240,${0.7 * glowIntensity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Keyhole slot
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(-6, 30);
    ctx.lineTo(6, 30);
    ctx.lineTo(6, 14);
    ctx.fillStyle = "#020a10";
    ctx.fill();
    ctx.strokeStyle = `rgba(0,200,240,${0.6 * glowIntensity})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  };

  // ─── Build chain path along a curve ───────────────────────────────────────
  const buildChainLinks = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    curve: number, // vertical bulge of bezier
    count: number
  ): ChainLink[] => {
    const links: ChainLink[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      // Quadratic Bezier
      const mx = (startX + endX) / 2;
      const my = (startY + endY) / 2 + curve;
      const bx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * mx + t * t * endX;
      const by = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * my + t * t * endY;

      // Tangent for angle
      const dx = 2 * (1 - t) * (mx - startX) + 2 * t * (endX - mx);
      const dy = 2 * (1 - t) * (my - startY) + 2 * t * (endY - my);
      const ang = Math.atan2(dy, dx);

      links.push({
        x: bx,
        y: by,
        angle: ang,
        width: 22,
        height: 13,
        depth: 5,
        hasNode: i % 4 === 0,
      });
    }
    return links;
  };

  // ─── main render loop ─────────────────────────────────────────────────────
  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = timestamp - startTimeRef.current;
    const t = Math.min(elapsed / TOTAL_DURATION, 1);

    // ── Background ──
    ctx.fillStyle = "#030a12";
    ctx.fillRect(0, 0, w, h);

    const envAlpha = Math.min(elapsed / P_ENV_END, 1);
    drawAtmosphericGlow(ctx, w, h, envAlpha);
    drawGrid(ctx, w, h, envAlpha);
    drawParticles(ctx, w, h, elapsed, envAlpha * 0.7);

    // Center coords
    const cx = w / 2;
    const cy = h / 2;

    // ── LOCK (behind title) ──
    if (elapsed > P_LOCK_START) {
      const lt = Math.min((elapsed - P_LOCK_START) / (P_LOCK_END - P_LOCK_START), 1);
      const lockAlpha = easeOutCubic(lt);
      const grabT = elapsed > P_GRAB_START
        ? Math.min((elapsed - P_GRAB_START) / (P_GRAB_END - P_GRAB_START), 1)
        : 0;
      const glowIntensity = lerp(0.3, 1.0, easeOutCubic(grabT));
      const lockScale = lerp(0.4, 1.0, easeOutBack(Math.min(lt * 1.2, 1)));

      drawLock(ctx, cx, cy + 20, lockScale, lockAlpha, glowIntensity, elapsed);
    }

    // ── SECUREMAX TITLE ──
    if (elapsed > P_TITLE_START) {
      const tt = Math.min((elapsed - P_TITLE_START) / (P_TITLE_END - P_TITLE_START), 1);
      const titleAlpha = easeOutCubic(tt);
      const titleScale = lerp(0.7, 1.0, easeOutBack(Math.min(tt * 1.1, 1)));

      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.translate(cx, cy);
      ctx.scale(titleScale, titleScale);

      // Font size responsive to canvas width
      const fontSize = Math.min(w * 0.09, 88);

      // 3D extrusion layers
      const extrusionDepth = 5;
      for (let d = extrusionDepth; d >= 0; d--) {
        const depthFraction = d / extrusionDepth;
        ctx.save();
        ctx.font = `900 ${fontSize}px 'Rajdhani', 'Orbitron', 'Exo 2', 'Segoe UI', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "4px";

        if (d > 0) {
          // Shadow/extrusion layers
          ctx.globalAlpha = titleAlpha * (0.4 - depthFraction * 0.3);
          ctx.fillStyle = `rgba(0,40,60,0.9)`;
          ctx.fillText("SECUREMAX", d * 1.2, d * 1.2);
        } else {
          // Main text layer
          // Metallic gradient fill
          const tg = ctx.createLinearGradient(-fontSize * 3.5, -fontSize / 2, fontSize * 3.5, fontSize / 2);
          tg.addColorStop(0, "#d0e8f0");
          tg.addColorStop(0.2, "#ffffff");
          tg.addColorStop(0.4, "#a0c8e0");
          tg.addColorStop(0.55, "#e8f4fa");
          tg.addColorStop(0.7, "#7ab8d4");
          tg.addColorStop(0.85, "#c0dcea");
          tg.addColorStop(1, "#d0e8f0");
          ctx.fillStyle = tg;
          ctx.fillText("SECUREMAX", 0, 0);

          // Cyan edge glow — stroke
          ctx.strokeStyle = "rgba(0,220,255,0.55)";
          ctx.lineWidth = 1.2;
          ctx.shadowColor = "rgba(0,200,255,0.6)";
          ctx.shadowBlur = 18;
          ctx.strokeText("SECUREMAX", 0, 0);
          ctx.shadowBlur = 0;

          // Subtle inner highlight
          const hg = ctx.createLinearGradient(0, -fontSize / 2, 0, -fontSize / 2 + 20);
          hg.addColorStop(0, "rgba(255,255,255,0.15)");
          hg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = hg;
          ctx.fillText("SECUREMAX", 0, 0);
        }
        ctx.restore();
      }
      ctx.restore();
    }

    // ── CHAINS ──
    if (elapsed > P_CHAIN_START) {
      const chainT = Math.min((elapsed - P_CHAIN_START) / (P_CHAIN_OUT - P_CHAIN_START), 1);
      const backT  = elapsed > P_CHAIN_OUT
        ? Math.min((elapsed - P_CHAIN_OUT) / (P_CHAIN_BACK - P_CHAIN_OUT), 1)
        : 0;
      const grabT  = elapsed > P_GRAB_START
        ? Math.min((elapsed - P_GRAB_START) / (P_GRAB_END - P_GRAB_START), 1)
        : 0;
      const chainAlpha = Math.min(easeOutCubic(chainT) * 1.4, 1);

      // Maximum link count
      const MAX_LINKS = 18;

      // ── LEFT CHAIN ──
      // Phase 1: emerges left, Phase 2: curves back, Phase 3: grabs lock
      const leftChainLinks = (() => {
        if (grabT > 0) {
          // Animate directly to grab point
          const leftGrabX = cx - 80;
          const leftGrabY = cy + 15;
          const startX = cx - w * 0.05;
          const startY = cy;
          const sideX = cx - w * 0.38;
          const sideY = cy - 20;

          const p1x = lerp(startX, sideX, 1);
          const p1y = lerp(startY, sideY, 1);
          const p2x = lerp(p1x, leftGrabX, easeOutCubic(grabT));
          const p2y = lerp(p1y, leftGrabY, easeOutCubic(grabT));
          return buildChainLinks(startX, startY, p2x, p2y, 30, MAX_LINKS);
        } else if (backT > 0) {
          const sideX = cx - w * 0.38;
          const sideY = cy - 20;
          const returnX = cx - w * 0.15;
          const returnY = cy + 10;
          const curX = lerp(sideX, returnX, easeInOutCubic(backT));
          const curY = lerp(sideY, returnY, easeInOutCubic(backT));
          const startX = cx - w * 0.05;
          return buildChainLinks(startX, cy, curX, curY, 35, MAX_LINKS);
        } else {
          const startX = cx - w * 0.05;
          const endX   = lerp(startX, cx - w * 0.38, easeOutCubic(chainT));
          const endY   = lerp(cy, cy - 20, easeOutCubic(chainT));
          return buildChainLinks(startX, cy, endX, endY, 20, Math.max(3, Math.round(MAX_LINKS * chainT)));
        }
      })();

      // ── RIGHT CHAIN ──
      const rightChainLinks = (() => {
        if (grabT > 0) {
          const rightGrabX = cx + 80;
          const rightGrabY = cy + 15;
          const startX = cx + w * 0.05;
          const startY = cy;
          const sideX = cx + w * 0.38;
          const sideY = cy - 20;

          const p1x = lerp(startX, sideX, 1);
          const p1y = lerp(startY, sideY, 1);
          const p2x = lerp(p1x, rightGrabX, easeOutCubic(grabT));
          const p2y = lerp(p1y, rightGrabY, easeOutCubic(grabT));
          return buildChainLinks(startX, startY, p2x, p2y, 30, MAX_LINKS);
        } else if (backT > 0) {
          const sideX = cx + w * 0.38;
          const sideY = cy - 20;
          const returnX = cx + w * 0.15;
          const returnY = cy + 10;
          const curX = lerp(sideX, returnX, easeInOutCubic(backT));
          const curY = lerp(sideY, returnY, easeInOutCubic(backT));
          const startX = cx + w * 0.05;
          return buildChainLinks(startX, cy, curX, curY, 35, MAX_LINKS);
        } else {
          const startX = cx + w * 0.05;
          const endX   = lerp(startX, cx + w * 0.38, easeOutCubic(chainT));
          const endY   = lerp(cy, cy - 20, easeOutCubic(chainT));
          return buildChainLinks(startX, cy, endX, endY, 20, Math.max(3, Math.round(MAX_LINKS * chainT)));
        }
      })();

      // Draw both chains
      [leftChainLinks, rightChainLinks].forEach((links, si) => {
        links.forEach((link, i) => {
          // alternate orientation for weave effect
          const angle = link.angle + (i % 2 === 0 ? 0 : Math.PI / 2);
          drawChainLink(
            ctx,
            link.x, link.y,
            angle,
            link.width, link.height,
            4,
            chainAlpha,
            link.hasNode,
            elapsed
          );
        });
      });
    }

    // ── FINAL GLOW PULSE when chains grab lock ──
    if (elapsed > P_GRAB_END) {
      const gt = Math.min((elapsed - P_GRAB_END) / (P_GLOW_END - P_GRAB_END), 1);
      const pulseRaw = Math.sin(elapsed * 0.006) * 0.3 + 0.7;
      const glowAlpha = easeOutCubic(gt) * 0.5 * pulseRaw;
      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy + 20, 0, cx, cy + 20, 200);
      glow.addColorStop(0, `rgba(0,200,255,${glowAlpha})`);
      glow.addColorStop(0.5, `rgba(0,100,180,${glowAlpha * 0.3})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ── FADE OUT at end ──
    if (elapsed > P_FADE_OUT) {
      const ft = Math.min((elapsed - P_FADE_OUT) / (TOTAL_DURATION - P_FADE_OUT), 1);
      ctx.save();
      ctx.globalAlpha = easeInOutCubic(ft);
      ctx.fillStyle = "#030a12";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ── Continue or finish ──
    if (elapsed >= TOTAL_DURATION) {
      if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
      return;
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles(canvas.width, canvas.height);
    };

    resize();
    window.addEventListener("resize", resize);

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [draw, initParticles]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#030a12",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />

      {/* Skip button */}
      <button
        onClick={() => {
          if (!doneRef.current) {
            doneRef.current = true;
            cancelAnimationFrame(rafRef.current);
            onComplete();
          }
        }}
        style={{
          position: "absolute",
          bottom: 32,
          right: 32,
          padding: "8px 20px",
          background: "rgba(0,200,255,0.08)",
          border: "1px solid rgba(0,200,255,0.25)",
          borderRadius: 8,
          color: "rgba(0,200,255,0.6)",
          fontSize: 12,
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: "0.05em",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = "rgba(0,200,255,0.15)";
          (e.target as HTMLButtonElement).style.color = "rgba(0,220,255,0.9)";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = "rgba(0,200,255,0.08)";
          (e.target as HTMLButtonElement).style.color = "rgba(0,200,255,0.6)";
        }}
      >
        SKIP
      </button>

      {/* Powered-by tag */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(0,180,220,0.25)",
          fontSize: 10,
          letterSpacing: "0.2em",
          fontFamily: "monospace",
          textTransform: "uppercase",
        }}
      >
        ZERO-TRUST · BLOCKCHAIN SECURED · DECENTRALIZED IDENTITY
      </div>
    </div>
  );
};

export default BlockchainHeroAnimation;
