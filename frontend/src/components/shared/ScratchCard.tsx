"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

type ScratchCardProps = {
  couponCode: string;
  discountPercent?: number;
  discountLabel?: string;
  onInteract?: () => void;
  onReveal?: () => void;
  service?: string;
  autoRevealThreshold?: number;
};

/* ---------- tiny helpers ---------- */
const rand = (a: number, b: number) => Math.random() * (b - a) + a;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: "sparkle" | "confetti";
  rotation: number;
  rotationSpeed: number;
};

const SPARKLE_COLORS = [
  "#FFD700",
  "#FFA500",
  "#FF8C00",
  "#FFEC8B",
  "#FFFACD",
  "#FFE4B5",
];
const CONFETTI_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#FF69B4",
  "#FFA07A",
  "#7B68EE",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
];

/* ========================================== */
/*            SCRATCH CARD COMPONENT          */
/* ========================================== */
const ScratchCard: React.FC<ScratchCardProps> = ({
  couponCode,
  discountPercent = 6,
  discountLabel,
  onInteract,
  onReveal,
  service,
  autoRevealThreshold = 45,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const [revealed, setRevealed] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [scratchPercent, setScratchPercent] = useState(0);
  const isScratchingRef = useRef(false);
  const hasInteracted = useRef(false);
  const animRunningRef = useRef(false);

  /* ---------- Draw the gold overlay ---------- */
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;

    const rect = card.getBoundingClientRect();
    const w2 = card.offsetWidth;
    const h2 = card.offsetHeight;
    // Use the LARGER of bounding rect vs offset to ensure full coverage
    const cw = Math.max(rect.width, w2);
    const ch = Math.max(rect.height, h2);
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.ceil(cw * dpr);
    canvas.height = Math.ceil(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Metallic gold gradient base
    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, "#C9A84C");
    baseGrad.addColorStop(0.25, "#F0D78C");
    baseGrad.addColorStop(0.5, "#DAA520");
    baseGrad.addColorStop(0.75, "#F5E6A3");
    baseGrad.addColorStop(1, "#B8860B");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Shimmer streaks
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 8; i++) {
      const sx = rand(0, w);
      const sy = rand(0, h);
      const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rand(60, 140) * dpr);
      sGrad.addColorStop(0, "rgba(255,255,255,0.4)");
      sGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sGrad;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // Diamond pattern
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1 * dpr;
    const spacing = 28 * dpr;
    for (let x = 0; x < w + h; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w - x, 0);
      ctx.lineTo(w - x + h, h);
      ctx.stroke();
    }
    ctx.restore();

    // Subtle noise texture
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 3000; i++) {
      const nx = rand(0, w);
      const ny = rand(0, h);
      ctx.fillStyle = Math.random() > 0.5 ? "#FFF" : "#000";
      ctx.fillRect(nx, ny, 1 * dpr, 1 * dpr);
    }
    ctx.restore();

    // "Scratch Here" text with hand icon
    ctx.save();
    ctx.globalAlpha = 0.75;
    const fontSize = 18 * dpr;
    ctx.font = `700 ${fontSize}px 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Text shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillText("✨ Scratch Here ✨", w / 2 + 2 * dpr, h / 2 + 2 * dpr);
    // Main text
    ctx.fillStyle = "#5C3D10";
    ctx.fillText("✨ Scratch Here ✨", w / 2, h / 2);

    // Subtitle
    const subSize = 12 * dpr;
    ctx.font = `500 ${subSize}px 'Inter', 'Segoe UI', system-ui, sans-serif`;
    ctx.globalAlpha = 0.5;
    ctx.fillText("Use your finger or mouse", w / 2, h / 2 + 28 * dpr);
    ctx.restore();

    // Border glow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3 * dpr;
    const borderRadius = 16 * dpr;
    ctx.beginPath();
    ctx.roundRect(2 * dpr, 2 * dpr, w - 4 * dpr, h - 4 * dpr, borderRadius);
    ctx.stroke();
    ctx.restore();
  }, []);

  /* ---------- Particle system ---------- */
  const spawnSparkles = useCallback((x: number, y: number) => {
    for (let i = 0; i < 2; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: rand(-1.5, 1.5),
        vy: rand(-2.5, -0.5),
        size: rand(2, 4),
        life: 1,
        maxLife: 1,
        color: SPARKLE_COLORS[Math.floor(rand(0, SPARKLE_COLORS.length))],
        type: "sparkle",
        rotation: 0,
        rotationSpeed: rand(-0.1, 0.1),
      });
    }
    // Kick animation if not already running
    if (!animRunningRef.current) {
      animRunningRef.current = true;
      animFrameRef.current = requestAnimationFrame(animateParticles);
    }
  }, []);

  const spawnConfetti = useCallback(() => {
    // Spawn from the card's actual center in the viewport
    const card = cardRef.current;
    const rect = card ? card.getBoundingClientRect() : null;
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    for (let i = 0; i < 50; i++) {
      particlesRef.current.push({
        x: cx + rand(-100, 100),
        y: cy + rand(-60, 60),
        vx: rand(-10, 10),
        vy: rand(-14, -3),
        size: rand(5, 10),
        life: 1,
        maxLife: 1,
        color: CONFETTI_COLORS[Math.floor(rand(0, CONFETTI_COLORS.length))],
        type: "confetti",
        rotation: rand(0, Math.PI * 2),
        rotationSpeed: rand(-0.15, 0.15),
      });
    }
    // Kick animation if not already running
    if (!animRunningRef.current) {
      animRunningRef.current = true;
      animFrameRef.current = requestAnimationFrame(animateParticles);
    }
  }, []);

  const animateParticles = useCallback(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;
    const ctx = pCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    const particles = particlesRef.current;
    const alive: Particle[] = [];

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.type === "confetti" ? 0.3 : 0.1;
      p.vx *= 0.98;
      p.life -= p.type === "confetti" ? 0.012 : 0.03;
      p.rotation += p.rotationSpeed;

      if (p.life <= 0) continue;
      alive.push(p);

      ctx.save();
      ctx.globalAlpha = Math.min(p.life, 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.type === "sparkle") {
        // Simple diamond shape (no shadowBlur = fast)
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.moveTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        // Tiny center dot
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Confetti rectangle
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }

    particlesRef.current = alive;

    if (alive.length > 0) {
      animFrameRef.current = requestAnimationFrame(animateParticles);
    } else {
      // Stop the loop entirely when no particles remain
      animRunningRef.current = false;
    }
  }, []);

  /* ---------- Setup ---------- */
  useEffect(() => {
    if (typeof window === "undefined" || revealed) return;
    drawOverlay();

    const card = cardRef.current;
    if (!card) return;
    const ro = new ResizeObserver(() => !revealed && drawOverlay());
    ro.observe(card);
    // Delayed redraw to ensure canvas fills after layout settles
    const t1 = setTimeout(() => drawOverlay(), 100);
    const t2 = setTimeout(() => drawOverlay(), 500);
    return () => { ro.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, [revealed, drawOverlay]);

  // Setup particle canvas — FULL VIEWPORT size (1x DPI for performance)
  useEffect(() => {
    const pCanvas = particleCanvasRef.current;
    if (!pCanvas) return;

    const resize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // 1x DPI — no scaling needed, much faster rendering
      pCanvas.width = vw;
      pCanvas.height = vh;
      pCanvas.style.width = `${vw}px`;
      pCanvas.style.height = `${vh}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Animation loop is kicked on-demand by spawnSparkles/spawnConfetti — no always-on loop

  /* ---------- Scratch logic ---------- */
  const scratchAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "destination-out";

    // Bigger, softer brush
    const r = 22 * dpr;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.7, "rgba(0,0,0,0.8)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    // Spawn sparkles at scratch point (viewport coordinates for full-screen canvas)
    spawnSparkles(e.clientX, e.clientY);
  };

  const calcClearedPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 0;

    const step = 8;
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let total = 0;
    let cleared = 0;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4 + 3;
        total++;
        if (data[idx] === 0) cleared++;
      }
    }
    return (cleared / total) * 100;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      onInteract?.();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isScratchingRef.current = true;
    scratchAt(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isScratchingRef.current) return;
    scratchAt(e);
    const pct = calcClearedPercent();
    setScratchPercent(Math.round(pct));
    if (pct >= autoRevealThreshold) revealAll();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(e.pointerId);
    isScratchingRef.current = false;
  };

  const revealAll = () => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Animated clear
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setRevealed(true);
    setScratchPercent(100);

    // Confetti burst!
    spawnConfetti();
    // Additional waves for a fuller effect
    setTimeout(() => spawnConfetti(), 250);
    setTimeout(() => spawnConfetti(), 500);
    setTimeout(() => spawnConfetti(), 800);

    onReveal?.();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = couponCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Progress indicator */}
      {!revealed && scratchPercent > 0 && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            color: "#5C3D10",
            padding: "2px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(255,165,0,0.3)",
          }}
        >
          {scratchPercent}% scratched
        </div>
      )}

      <div
        ref={cardRef}
        style={{
          position: "relative",
          width: "100%",
          overflow: "hidden",
          borderRadius: 20,
          background: revealed
            ? "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
            : "#FFF",
          boxShadow: revealed
            ? "0 20px 60px rgba(15, 52, 96, 0.4), 0 0 40px rgba(255, 215, 0, 0.15)"
            : "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,215,0,0.2)",
          transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Inner glow border for revealed state */}
        {revealed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              border: "2px solid rgba(255,215,0,0.3)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}

        {/* Hidden content (the reward) */}
        <div style={{ padding: 28, textAlign: "center" }}>
          {/* Celebration emoji */}
          {revealed && (
            <div
              style={{
                fontSize: 48,
                marginBottom: 8,
                animation: "bounce 0.6s ease",
              }}
            >
              🎉
            </div>
          )}

          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: revealed ? "rgba(255,255,255,0.7)" : "#6B7280",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            You unlocked
          </div>

          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: revealed ? "#FFD700" : "#16a34a",
              letterSpacing: -1,
              lineHeight: 1.1,
              marginBottom: 8,
              textShadow: revealed
                ? "0 0 20px rgba(255,215,0,0.4), 0 2px 10px rgba(255,165,0,0.3)"
                : "none",
              transition: "all 0.5s ease",
            }}
          >
            {discountLabel ?? `${discountPercent}% OFF`}
          </div>

          <div
            style={{
              fontSize: 15,
              color: revealed ? "rgba(255,255,255,0.6)" : "#6B7280",
              marginBottom: 20,
            }}
          >
            Use this coupon on your next {service || "order"}.
          </div>

          {/* Coupon code area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                position: "relative",
                background: revealed
                  ? "rgba(255,215,0,0.1)"
                  : "#F3F4F6",
                border: revealed
                  ? "2px dashed rgba(255,215,0,0.4)"
                  : "2px dashed #D1D5DB",
                borderRadius: 12,
                padding: "10px 20px",
                transition: "all 0.5s ease",
              }}
            >
              <code
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 3,
                  color: revealed ? "#FFD700" : "#374151",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
              >
                {couponCode}
              </code>
            </div>

            <button
              onClick={copyCode}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                color: "#FFF",
                background:
                  copyState === "copied"
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "linear-gradient(135deg, #F97316, #EA580C)",
                boxShadow:
                  copyState === "copied"
                    ? "0 4px 16px rgba(34,197,94,0.4)"
                    : "0 4px 16px rgba(249,115,22,0.4)",
                transform: copyState === "copied" ? "scale(1.05)" : "scale(1)",
                transition: "all 0.3s ease",
              }}
            >
              {copyState === "copied" ? " Copied!" : "Copy"}
            </button>
          </div>

          <p
            style={{
              marginTop: 16,
              fontSize: 12,
              color: revealed ? "rgba(255,255,255,0.4)" : "#9CA3AF",
            }}
          >
            Applies to the next {service || "order"}. One-time use per customer.
          </p>
        </div>

        {/* Scratch canvas overlay */}
        {!revealed && (
          <>
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                touchAction: "none",
                display: "block",
                cursor: "crosshair",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {/* Pulsing border hint */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                borderRadius: 20,
                pointerEvents: "none",
                boxShadow: "inset 0 0 30px rgba(255,215,0,0.15)",
                animation: "pulseGlow 2s ease-in-out infinite",
              }}
            />
            {/* Skip button */}
            <button
              type="button"
              onClick={revealAll}
              style={{
                position: "absolute",
                right: 10,
                bottom: 10,
                zIndex: 30,
                padding: "4px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(4px)",
                color: "rgba(255,255,255,0.8)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.4)";
              }}
            >
              Tap to reveal
            </button>
          </>
        )}

      </div>

      {/* Particle effects canvas - FULL SCREEN overlay for confetti */}
      <canvas
        ref={particleCanvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: inset 0 0 30px rgba(255,215,0,0.1); }
          50% { box-shadow: inset 0 0 50px rgba(255,215,0,0.25); }
        }
        @keyframes bounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ScratchCard;
