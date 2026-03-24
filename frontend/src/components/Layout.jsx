import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar.jsx';

// ── Particle Canvas ────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d');
    let id, particles = [];
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    class P {
      constructor() { this.r(); }
      r() {
        this.x = Math.random() * c.width; this.y = Math.random() * c.height;
        this.vx = (Math.random() - .5) * .35; this.vy = (Math.random() - .5) * .35;
        this.s = Math.random() * 1.4 + .3; this.a = Math.random() * .45 + .08;
        this.col = Math.random() > .55 ? '#8b5cf6' : Math.random() > .5 ? '#3b82f6' : '#06b6d4';
      }
      update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > c.width || this.y < 0 || this.y > c.height) this.r(); }
      draw() { ctx.save(); ctx.globalAlpha = this.a; ctx.fillStyle = this.col; ctx.shadowBlur = 5; ctx.shadowColor = this.col; ctx.beginPath(); ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    for (let i = 0; i < 110; i++) particles.push(new P());
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      particles.forEach((a, i) => particles.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 90) { ctx.save(); ctx.globalAlpha = (1 - d / 90) * .12; ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore(); }
      }));
      particles.forEach(p => { p.update(); p.draw(); });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Cursor Glow ────────────────────────────────────────────────
function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const move = e => { el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return <div ref={ref} style={{
    position: 'fixed', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none',
    zIndex: 1, transform: 'translate(-50%,-50%)',
    background: 'radial-gradient(circle,rgba(139,92,246,.07) 0%,transparent 70%)',
    transition: 'left .12s ease,top .12s ease'
  }} />;
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="layout">
      <ParticleCanvas />
      <CursorGlow />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className="layout-main">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ height: '100%' }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
