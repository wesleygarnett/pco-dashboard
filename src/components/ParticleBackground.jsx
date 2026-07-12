import { useEffect, useRef } from 'react';

// Night palette (violet, green, indigo) — matches the theme's avatar gradients
const COLORS = [
  [167, 139, 250], // violet
  [110, 231, 160], // green
  [129, 140, 248], // indigo
];

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W, H, particles;
    let rafId;

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

    function draw() {
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
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    particles = Array.from({ length: 90 }, mkParticle);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
