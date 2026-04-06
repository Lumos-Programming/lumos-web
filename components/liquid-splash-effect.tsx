"use client";

import { useEffect, useRef } from "react";

interface LiquidSplashEffectProps {
  width: number;
  height: number;
  onComplete: () => void;
}

const PALETTE = [
  [168, 85, 247], // purple-500
  [129, 140, 248], // indigo-400
  [192, 132, 252], // purple-400
  [124, 58, 237], // violet-600
  [232, 121, 249], // fuchsia-400
  [99, 102, 241], // indigo-500
  [167, 139, 250], // violet-400
  [240, 171, 252], // fuchsia-300
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Smooth ease: slow start, smooth middle, slow end
function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

const OVERFLOW_SCALE = 4;

interface Blob {
  // Target position (relative to center, in the "spread" state)
  tx: number;
  ty: number;
  // Current position
  x: number;
  y: number;
  radius: number;
  color: number[]; // [r,g,b]
  blur: number;
  // Staggered start: 0-1, when this blob begins its animation
  stagger: number;
}

function createBlobs(cx: number, cy: number): Blob[] {
  const blobs: Blob[] = [];

  // Inner ring: large soft blobs
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + rand(-0.2, 0.2);
    const dist = rand(50, 90);
    blobs.push({
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      x: cx,
      y: cy,
      radius: rand(35, 55),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      blur: rand(15, 25),
      stagger: rand(0, 0.15),
    });
  }

  // Outer ring: medium blobs
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + rand(-0.25, 0.25);
    const dist = rand(80, 150);
    blobs.push({
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      x: cx,
      y: cy,
      radius: rand(20, 40),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      blur: rand(10, 20),
      stagger: rand(0.05, 0.25),
    });
  }

  // Edge: small soft dots
  for (let i = 0; i < 12; i++) {
    const angle = rand(0, Math.PI * 2);
    const dist = rand(120, 200);
    blobs.push({
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      x: cx,
      y: cy,
      radius: rand(8, 20),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      blur: rand(6, 14),
      stagger: rand(0.1, 0.35),
    });
  }

  return blobs;
}

export function LiquidSplashEffect({
  width,
  height,
  onComplete,
}: LiquidSplashEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = width * OVERFLOW_SCALE;
    const ch = height * OVERFLOW_SCALE;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const cx = cw / 2;
    const cy = ch / 2;
    const blobs = createBlobs(cx, cy);
    let rafId: number;

    // Total duration ~3.5s at 60fps
    const TOTAL_FRAMES = 210;
    // Spread phase: blobs ooze outward from center
    const SPREAD_END = 80;
    // Hold phase: blobs are fully spread
    const HOLD_END = 130;
    // Fade phase: blobs gently dissolve
    // (130→210)

    let startTime = 0;
    let animFrame = 0;

    function tickFrame(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      animFrame = (elapsed / 1000) * 60; // convert to ~60fps frame count

      if (animFrame > TOTAL_FRAMES) {
        onCompleteRef.current();
        return;
      }

      ctx!.clearRect(0, 0, cw, ch);

      for (const blob of blobs) {
        // Per-blob spread progress (with stagger)
        const spreadT = Math.max(
          0,
          Math.min(1, (animFrame - blob.stagger * SPREAD_END) / SPREAD_END),
        );
        const easedSpread = easeInOutQuart(spreadT);

        // Position: smoothly ooze from center to target
        blob.x = cx + blob.tx * easedSpread;
        blob.y = cy + blob.ty * easedSpread;

        // Opacity: fade in during spread, hold, then fade out
        let opacity: number;
        if (animFrame < SPREAD_END) {
          // Gentle fade in
          opacity = easeInOutQuart(Math.min(spreadT * 1.5, 1)) * 0.7;
        } else if (animFrame < HOLD_END) {
          opacity = 0.7;
        } else {
          // Smooth fade out
          const fadeT = (animFrame - HOLD_END) / (TOTAL_FRAMES - HOLD_END);
          opacity = 0.7 * (1 - easeInOutQuart(fadeT));
        }

        if (opacity < 0.01) continue;

        // Scale: slightly grow during spread, slightly shrink during fade
        let scale = 1;
        if (animFrame < SPREAD_END) {
          scale = 0.6 + 0.4 * easedSpread;
        } else if (animFrame > HOLD_END) {
          const fadeT = (animFrame - HOLD_END) / (TOTAL_FRAMES - HOLD_END);
          scale = 1 - 0.2 * easeInOutQuart(fadeT);
        }

        const r = blob.radius * scale;
        const [cr, cg, cb] = blob.color;

        // Draw soft radial gradient blob
        ctx!.save();
        ctx!.filter = `blur(${blob.blur * scale}px)`;
        ctx!.globalAlpha = opacity;

        const grad = ctx!.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          r,
        );
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
        grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.6)`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);

        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(blob.x, blob.y, r, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.restore();
      }

      rafId = requestAnimationFrame(tickFrame);
    }

    rafId = requestAnimationFrame(tickFrame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [width, height]);

  const cw = width * OVERFLOW_SCALE;
  const ch = height * OVERFLOW_SCALE;
  const offsetX = (cw - width) / 2;
  const offsetY = (ch - height) / 2;

  return (
    <canvas
      ref={canvasRef}
      className="absolute z-[5] pointer-events-none"
      style={{
        width: cw,
        height: ch,
        left: -offsetX,
        top: -offsetY,
      }}
    />
  );
}
