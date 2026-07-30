import { useEffect, useRef } from 'react';

// Night palette (violet, green, indigo) — matches the theme's avatar gradients
const COLORS = [
  [167, 139, 250], // violet
  [110, 231, 160], // green
  [129, 140, 248], // indigo
];

// This canvas runs for as long as the app is open — which on a wall display is
// months. Capping the frame rate and pausing when nothing can see it keeps an
// old Intel mini's integrated GPU from spinning its fans forever.
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H, particles;
    let rafId;
    let lastFrame = 0;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function mkParticle() {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(Math.random() * 0.25 + 0.06),
        alpha: Math.random() * 0.08 + 0.16,
        color: c,
      };
    }

    function draw(ts) {
      rafId = requestAnimationFrame(draw);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const [r, g, b] = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -2) {
          p.y = H + 2;
          p.x = Math.random() * W;
        }
        if (p.x < -2) p.x = W + 2;
        if (p.x > W + 2) p.x = -2;
      }
    }

    function start() {
      if (rafId) return;
      lastFrame = 0;
      rafId = requestAnimationFrame(draw);
    }

    function stop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    // Nothing to animate for while the display is asleep or the app is hidden.
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    particles = Array.from({ length: 90 }, mkParticle);
    start();

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
