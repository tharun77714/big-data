import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const API_URL = '/api';
const _wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL = `${_wsProto}://${window.location.host}/ws/prices`;
const STATS_WS_URL = `${_wsProto}://${window.location.host}/ws/dashboard`;

// ─── Particle Canvas Background ────────────────────────────────────────────
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 1.5 + 0.3;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.color = Math.random() > 0.6 ? '#8b5cf6' : Math.random() > 0.5 ? '#3b82f6' : '#06b6d4';
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 6; ctx.shadowColor = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < 120; i++) particles.push(new Particle());

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.save();
            ctx.globalAlpha = (1 - d / 100) * 0.15;
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.restore();
          }
        });
      });
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

// ─── Cursor Glow ─────────────────────────────────────────────────────────
const CursorGlow = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const move = e => { el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return (
    <div ref={ref} style={{
      position: 'fixed', width: 400, height: 400,
      borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
      transform: 'translate(-50%, -50%)',
      background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
      transition: 'left 0.12s ease, top 0.12s ease'
    }} />
  );
};

// ─── Animated Number ─────────────────────────────────────────────────────
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 2 }) => {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState('');
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      const dir = value > prev.current ? 'up' : 'down';
      setFlash(dir);
      const start = prev.current, end = value, dur = 600;
      const t0 = performance.now();
      const step = ts => {
        const p = Math.min((ts - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setDisplay(start + (end - start) * ease);
        if (p < 1) requestAnimationFrame(step);
        else { setDisplay(end); setTimeout(() => setFlash(''), 1000); }
      };
      requestAnimationFrame(step);
      prev.current = value;
    }
  }, [value]);
  return (
    <span className={`anim-num ${flash}`}>
      {prefix}{Number(display).toFixed(decimals)}{suffix}
    </span>
  );
};

// ─── Magnetic Button ─────────────────────────────────────────────────────
const MagneticBtn = ({ children, onClick, className }) => {
  const ref = useRef(null);
  const handleMove = e => {
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    ref.current.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  };
  const handleLeave = () => { ref.current.style.transform = 'translate(0,0)'; };
  return (
    <button ref={ref} className={className} onClick={onClick}
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ transition: 'transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
      {children}
    </button>
  );
};

// ─── Glassmorphism Stat Card ──────────────────────────────────────────────
const GlassStatCard = ({ icon, label, value, color, glow }) => (
  <div className="glass-stat-card" style={{ '--card-glow': glow }}>
    <div className="gsc-icon" style={{ background: color }}>{icon}</div>
    <div className="gsc-body">
      <div className="gsc-label">{label}</div>
      <div className="gsc-value">{value}</div>
    </div>
    <div className="gsc-shimmer" />
  </div>
);

// ─── Product Card ─────────────────────────────────────────────────────────
const ProductCard = ({ product, onClick, prevPrice, isSelected }) => {
  const change = ((product.current_price - product.base_price) / product.base_price * 100);
  const isSurge = change > 1, isDrop = change < -1;
  const [ripples, setRipples] = useState([]);

  const handleClick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 800);
    onClick();
  };

  return (
    <div
      className={`pcard ${isSurge ? 'surge' : isDrop ? 'drop' : 'stable'} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      {ripples.map(r => (
        <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />
      ))}
      <div className="pcard-img">
        <img src={product.image_url} alt={product.name}
          onError={e => { e.target.src = `https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80`; }} />
        <div className="pcard-img-overlay" />
        <div className={`pcard-badge ${isSurge ? 'badge-s' : isDrop ? 'badge-d' : 'badge-n'}`}>
          {isSurge ? '▲ SURGE' : isDrop ? '▼ DROP' : '● STABLE'}
        </div>
        <div className="pcard-cat">{product.category}</div>
      </div>
      <div className="pcard-body">
        <h3 className="pcard-name">{product.name}</h3>
        <div className="pcard-price-row">
          <div>
            <div className="pcard-plabel">Live Price</div>
            <AnimatedNumber value={Number(product.current_price)} prefix="$" />
          </div>
          <div className={`pcard-change ${change > 1 ? 'up' : change < -1 ? 'dn' : 'flat'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        </div>
        <div className="pcard-meta">
          <span>Base ${Number(product.base_price).toFixed(2)}</span>
          <span>Demand {(product.demand_score || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Live Ticker ──────────────────────────────────────────────────────────
const LiveTicker = ({ products }) => {
  const items = products.slice(0, 8);
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {[...items, ...items].map((p, i) => {
          const chg = ((p.current_price - p.base_price) / p.base_price * 100);
          return (
            <span key={i} className={`ticker-item ${chg > 1 ? 'up' : chg < -1 ? 'dn' : ''}`}>
              {p.name.split(' ').slice(0, 2).join(' ')}
              &nbsp;<strong>${Number(p.current_price).toFixed(2)}</strong>
              &nbsp;{chg > 0 ? '▲' : '▼'}{Math.abs(chg).toFixed(1)}%
              &nbsp;&nbsp;·&nbsp;&nbsp;
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p className="ct-time">{new Date(label).toLocaleTimeString()}</p>
      <p className="ct-price">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [priceEvents, setPriceEvents] = useState([]);
  const prevPricesRef = useRef({});

  // WebSocket
  useEffect(() => {
    let wsRetry, statsRetry;
    function connectWS() {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); wsRetry = setTimeout(connectWS, 3000); };
      ws.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.type === 'price_update') {
          setProducts(prev => {
            const events = [];
            data.products.forEach(p => {
              const old = prevPricesRef.current[p.id];
              if (old && Math.abs(p.current_price - old) > 0.01) {
                events.push({ id: p.id, name: p.name, old, new: p.current_price, dir: p.current_price > old ? 'up' : 'down' });
              }
              prevPricesRef.current[p.id] = p.current_price;
            });
            if (events.length) setPriceEvents(ev => [...events, ...ev].slice(0, 5));
            return data.products;
          });
        }
      };
      return ws;
    }
    function connectStats() {
      const ws = new WebSocket(STATS_WS_URL);
      ws.onclose = () => { statsRetry = setTimeout(connectStats, 3000); };
      ws.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.type === 'dashboard_update') setStats(data.data);
      };
      return ws;
    }
    const w1 = connectWS(), w2 = connectStats();
    return () => { clearTimeout(wsRetry); clearTimeout(statsRetry); try { w1.close(); } catch {} try { w2.close(); } catch {} };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetch(`${API_URL}/products`).then(r => r.json()).then(d => {
      setProducts(d.products || []);
      const m = {};
      (d.products || []).forEach(p => { m[p.id] = p.current_price; });
      prevPricesRef.current = m;
    }).catch(console.error);
  }, []);

  // History
  useEffect(() => {
    if (!selectedId) return;
    fetch(`${API_URL}/products/${selectedId}/history?limit=40`)
      .then(r => r.json()).then(d => setHistory((d.history || []).reverse())).catch(console.error);
  }, [selectedId, products]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const selected = products.find(p => p.id === selectedId);
  const surgeCount = products.filter(p => p.current_price > p.base_price * 1.01).length;
  const dropCount = products.filter(p => p.current_price < p.base_price * 0.99).length;
  const avgPrice = products.length
    ? (products.reduce((s, p) => s + Number(p.current_price), 0) / products.length).toFixed(2)
    : '0.00';

  return (
    <div className="app-root">
      <ParticleCanvas />
      <CursorGlow />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-wrap">
          <div className="logo-orb">⚡</div>
          <div>
            <h1 className="logo-title">PulsePrice</h1>
            <p className="logo-sub">ML-Powered Dynamic Pricing Engine</p>
          </div>
        </div>
        <div className="header-right">
          <div className={`conn-badge ${connected ? 'live' : 'offline'}`}>
            <span className="conn-dot" />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <MagneticBtn className="theme-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀' : '🌙'}
          </MagneticBtn>
        </div>
      </header>

      {/* ── Ticker ── */}
      {products.length > 0 && <LiveTicker products={products} />}

      {/* ── Stats ── */}
      <div className="stats-grid">
        <GlassStatCard icon="📦" label="Total Products" value={products.length} color="rgba(59,130,246,0.2)" glow="rgba(59,130,246,0.3)" />
        <GlassStatCard icon="🔥" label="Active Surges" value={surgeCount} color="rgba(244,63,94,0.2)" glow="rgba(244,63,94,0.3)" />
        <GlassStatCard icon="💚" label="Active Drops" value={dropCount} color="rgba(16,185,129,0.2)" glow="rgba(16,185,129,0.3)" />
        <GlassStatCard icon="💰" label="Avg Price" value={`$${avgPrice}`} color="rgba(139,92,246,0.2)" glow="rgba(139,92,246,0.4)" />
      </div>

      {/* ── Price Event Feed ── */}
      {priceEvents.length > 0 && (
        <div className="event-feed">
          <span className="ef-label">⚡ LIVE CHANGES</span>
          {priceEvents.map((ev, i) => (
            <span key={i} className={`ef-item ${ev.dir}`}>
              {ev.name.split(' ').slice(0, 2).join(' ')}
              &nbsp;{ev.dir === 'up' ? '▲' : '▼'} ${Math.abs(ev.new - ev.old).toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="main-grid">

        {/* Product Grid */}
        <div className="products-col">
          <div className="col-header">
            <h2>🛍️ Live Store</h2>
            <span className="col-badge">Updates every 30s via WebSocket</span>
          </div>
          <div className="product-grid">
            {products.map(p => (
              <ProductCard
                key={p.id} product={p}
                prevPrice={prevPricesRef.current[p.id]}
                isSelected={selectedId === p.id}
                onClick={() => setSelectedId(prev => prev === p.id ? null : p.id)}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="detail-col">
          {selected ? (
            <div className="detail-panel">
              <div className="dp-glow" style={{
                background: selected.current_price > selected.base_price * 1.01
                  ? 'radial-gradient(ellipse at top, rgba(244,63,94,0.15) 0%, transparent 70%)'
                  : selected.current_price < selected.base_price * 0.99
                  ? 'radial-gradient(ellipse at top, rgba(16,185,129,0.15) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, transparent 70%)'
              }} />
              <div className="dp-header">
                <div>
                  <h2 className="dp-title">{selected.name}</h2>
                  <p className="dp-sub">#{selected.id} · {selected.category}</p>
                </div>
                <MagneticBtn className="close-btn" onClick={() => setSelectedId(null)}>✕</MagneticBtn>
              </div>

              <div className="dp-price-hero">
                <AnimatedNumber value={Number(selected.current_price)} prefix="$" decimals={2} />
                <span className={`dp-chg ${selected.current_price > selected.base_price ? 'up' : selected.current_price < selected.base_price ? 'dn' : 'flat'}`}>
                  {(((selected.current_price - selected.base_price) / selected.base_price) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="dp-stats">
                {[
                  { label: 'Base Price', val: `$${Number(selected.base_price).toFixed(2)}` },
                  { label: 'Demand Score', val: (selected.demand_score || 0).toFixed(3) },
                  { label: 'Stock Level', val: selected.stock_level },
                  { label: 'Competitor', val: `$${Number(selected.competitor_price || 0).toFixed(2)}` },
                ].map(({ label, val }) => (
                  <div key={label} className="dp-stat">
                    <div className="dp-stat-label">{label}</div>
                    <div className="dp-stat-val">{val}</div>
                  </div>
                ))}
              </div>

              <div className="dp-chart">
                <h3>📈 Price History</h3>
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="recorded_at" hide />
                      <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.2)"
                        fontSize={10} tickFormatter={v => `$${v}`} width={55} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={2.5}
                        fill="url(#priceGrad)" dot={false} isAnimationActive={true} animationDuration={300} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">Collecting data points...</div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <div className="ep-orb">📊</div>
              <h3>Select a Product</h3>
              <p>Click any product card to view real-time pricing analytics and live price history</p>
              <div className="ep-dots">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
