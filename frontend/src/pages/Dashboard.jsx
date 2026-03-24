import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePricing, API_URL } from '../context/PricingContext.jsx';

// ── Helpers ────────────────────────────────────────────────────
function getAIReason(p) {
  const chg = ((p.current_price - p.base_price) / p.base_price * 100);
  const d = p.demand_score || 0;
  const st = p.stock_level || 100;
  const comp = p.competitor_price;
  const parts = [];
  if (d > 0.65) parts.push(`high demand (${(d * 100).toFixed(0)}% intensity)`);
  else if (d < 0.3) parts.push(`weak demand signals`);
  if (st < 25) parts.push(`critically low stock (${st} units)`);
  else if (st > 300) parts.push(`excess inventory (${st} units)`);
  if (comp && comp < p.current_price * 0.95) parts.push(`competitor undercut by ${(((p.current_price - comp) / p.current_price) * 100).toFixed(1)}%`);
  if (chg > 5) return `Price surged +${chg.toFixed(1)}% due to ${parts.join(', ') || 'market conditions'}.`;
  if (chg < -3) return `Price dropped ${chg.toFixed(1)}% due to ${parts.join(', ') || 'low conversion rate'}.`;
  return `Price is stable${parts.length ? ` despite ${parts.join(', ')}` : ''} — within optimal range.`;
}

function getAISuggestedPrice(p) {
  const d = p.demand_score || 0;
  const st = p.stock_level || 100;
  let mult = 1.0;
  if (d > 0.7 && st < 30) mult = 1.10;
  else if (d > 0.5) mult = 1.04;
  else if (d < 0.25) mult = 0.95;
  const suggested = Math.max(p.base_price * 0.88, Math.min(p.base_price * 1.12, p.base_price * mult));
  return parseFloat(suggested.toFixed(2));
}

// ── Animated Number ────────────────────────────────────────────
function AnimNum({ value, prefix = '', decimals = 2 }) {
  const [disp, setDisp] = useState(value);
  const [flash, setFlash] = useState('');
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const dir = value > prev.current ? 'up' : 'down';
    setFlash(dir);
    const s = prev.current, e = value, dur = 500;
    const t0 = performance.now();
    const step = ts => {
      const prog = Math.min((ts - t0) / dur, 1);
      setDisp(s + (e - s) * (1 - Math.pow(1 - prog, 3)));
      if (prog < 1) requestAnimationFrame(step);
      else { setDisp(e); setTimeout(() => setFlash(''), 900); }
    };
    requestAnimationFrame(step);
    prev.current = value;
  }, [value]);
  return <span className={`animnum ${flash}`}>{prefix}{Number(disp).toFixed(decimals)}</span>;
}

// ── 3D Tilt Card ──────────────────────────────────────────────
function TiltCard({ children, className, onClick }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotX = useTransform(y, [-60, 60], [8, -8]);
  const rotY = useTransform(x, [-60, 60], [-8, 8]);
  const handleMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  };
  const handleLeave = () => { x.set(0); y.set(0); };
  return (
    <motion.div className={className} onClick={onClick}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 800, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}>
      {children}
    </motion.div>
  );
}

// ── Ripple Button ─────────────────────────────────────────────
function RippleBtn({ children, onClick, className }) {
  const [ripples, setRipples] = useState([]);
  const handleClick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples(p => p.filter(r => r.id !== id)), 700);
    onClick && onClick();
  };
  return (
    <button className={className} onClick={handleClick} style={{ position: 'relative', overflow: 'hidden' }}>
      {ripples.map(r => <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />)}
      {children}
    </button>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div key={t.id} className={`toast toast-${t.type}`}
            initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}>
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <p style={{ color: 'var(--text3)', fontSize: 10, marginBottom: 4, fontFamily: 'var(--mono)' }}>{new Date(label).toLocaleTimeString()}</p>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700, color: 'var(--purple2)' }}>${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
}

// ── Market Mood ───────────────────────────────────────────────
function MarketMood({ products }) {
  const surges = products.filter(p => p.current_price > p.base_price * 1.01).length;
  const drops = products.filter(p => p.current_price < p.base_price * 0.99).length;
  const total = products.length || 1;
  const score = Math.round((surges / total) * 100);
  const mood = score > 60 ? { label: 'GREED', col: '#f43f5e' } : score > 40 ? { label: 'NEUTRAL', col: '#6366f1' } : { label: 'FEAR', col: '#10b981' };
  return (
    <div className="mood-card">
      <div className="mood-label">Market Mood</div>
      <div className="mood-bar-wrap">
        <div className="mood-bar">
          <motion.div className="mood-fill" style={{ background: mood.col }}
            initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <div className="mood-ends"><span style={{ color: '#10b981' }}>FEAR</span><span style={{ color: '#f43f5e' }}>GREED</span></div>
      </div>
      <div className="mood-score" style={{ color: mood.col }}>{score}<span>/100</span></div>
      <div className="mood-tag" style={{ color: mood.col }}>{mood.label}</div>
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 24 } }
};

function ProductCard({ product, onClick, isSelected }) {
  const chg = ((product.current_price - product.base_price) / product.base_price * 100);
  const isSurge = chg > 1, isDrop = chg < -1;
  return (
    <TiltCard className={`pcard ${isSurge ? 'surge' : isDrop ? 'drop' : 'stable'} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}>
      <div className="pcard-img">
        <img src={product.image_url} alt={product.name}
          onError={e => e.target.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80'} />
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
            <AnimNum value={Number(product.current_price)} prefix="$" />
          </div>
          <div className={`pcard-change ${chg > 1 ? 'up' : chg < -1 ? 'dn' : 'flat'}`}>
            {chg > 0 ? '+' : ''}{chg.toFixed(1)}%
          </div>
        </div>
        <div className="pcard-meta">
          <span>Base ${Number(product.base_price).toFixed(2)}</span>
          <span>Dmnd {(product.demand_score || 0).toFixed(2)}</span>
        </div>
      </div>
    </TiltCard>
  );
}

// ── Detail Panel with Tabs ────────────────────────────────────
const TABS = ['Overview', 'Demand', 'AI Reason', 'Controls', 'Competitor'];

function DetailPanel({ product, history, onClose }) {
  const [tab, setTab] = useState('Overview');
  const [toasts, setToasts] = useState([]);
  const [locked, setLocked] = useState(false);
  const [auto, setAuto] = useState(false);
  const chg = ((product.current_price - product.base_price) / product.base_price * 100);
  const suggested = getAISuggestedPrice(product);
  const reason = getAIReason(product);

  const showToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  return (
    <motion.div className="detail-panel"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
      <Toast toasts={toasts} />
      <div className="dp-glow" style={{
        background: chg > 1 ? 'radial-gradient(ellipse at top,rgba(244,63,94,.13) 0%,transparent 70%)'
          : chg < -1 ? 'radial-gradient(ellipse at top,rgba(16,185,129,.12) 0%,transparent 70%)'
          : 'radial-gradient(ellipse at top,rgba(99,102,241,.1) 0%,transparent 70%)'
      }} />

      {/* Header */}
      <div className="dp-header">
        <div>
          <h2 className="dp-title">{product.name}</h2>
          <p className="dp-sub">#{product.id} · {product.category}</p>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Hero Price */}
      <div className="dp-price-hero">
        <AnimNum value={Number(product.current_price)} prefix="$" />
        <span className={`dp-chg ${chg > 1 ? 'up' : chg < -1 ? 'dn' : 'flat'}`}>
          {chg > 0 ? '+' : ''}{chg.toFixed(1)}%
        </span>
      </div>

      {/* Tabs */}
      <div className="dp-tabs">
        {TABS.map(t => (
          <button key={t} className={`dp-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {tab === t && <motion.div className="dp-tab-line" layoutId="tab-line" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>

          {tab === 'Overview' && (
            <div className="dp-stats">
              {[
                { label: 'Base Price', val: `$${Number(product.base_price).toFixed(2)}` },
                { label: 'Demand Score', val: (product.demand_score || 0).toFixed(3) },
                { label: 'Stock Level', val: product.stock_level },
                { label: 'Competitor', val: `$${Number(product.competitor_price || 0).toFixed(2)}` },
              ].map(({ label, val }) => (
                <div key={label} className="dp-stat">
                  <div className="dp-stat-label">{label}</div>
                  <div className="dp-stat-val">{val}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Demand' && (
            <div className="demand-tab">
              <div className="demand-score-row">
                <span>Demand Score</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--purple2)' }}>
                  {((product.demand_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="demand-bar-bg">
                <motion.div className="demand-bar-fill"
                  style={{ background: (product.demand_score || 0) > 0.6 ? 'var(--red)' : (product.demand_score || 0) > 0.35 ? 'var(--purple)' : 'var(--green)' }}
                  initial={{ width: 0 }} animate={{ width: `${(product.demand_score || 0) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }} />
              </div>
              {[
                { label: '👁 Views', val: product.view_count || 0, max: 200 },
                { label: '🛒 Carts', val: product.cart_count || 0, max: 80 },
                { label: '💳 Purchases', val: product.purchase_count || 0, max: 40 },
              ].map(({ label, val, max }) => (
                <div key={label} className="demand-metric">
                  <div className="demand-metric-top"><span>{label}</span><span style={{ fontFamily: 'var(--mono)' }}>{val}</span></div>
                  <div className="demand-bar-bg" style={{ height: 6 }}>
                    <motion.div className="demand-bar-fill" style={{ background: 'var(--blue)' }}
                      initial={{ width: 0 }} animate={{ width: `${Math.min((val / max) * 100, 100)}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'AI Reason' && (
            <div className="ai-reason-tab">
              <div className="ai-reason-box">
                <div className="ai-reason-icon">🤖</div>
                <p className="ai-reason-text">{reason}</p>
              </div>
              <div className="ai-confidence">
                <span>ML Confidence</span>
                <div className="conf-bar-bg">
                  <motion.div className="conf-bar-fill"
                    initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ duration: 0.9, delay: 0.2 }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--purple2)', fontWeight: 700 }}>78%</span>
              </div>
              {history.length > 1 && (
                <div className="dp-chart">
                  <h3>📈 Price History</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.15)" fontSize={9} tickFormatter={v => `$${v}`} width={48} />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={2}
                        fill="url(#areaGrad)" dot={false} isAnimationActive animationDuration={400} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {tab === 'Controls' && (
            <div className="controls-tab">
              <div className="ctrl-price-row">
                <div className="ctrl-price-box">
                  <div className="ctrl-label">Current</div>
                  <div className="ctrl-val">${Number(product.current_price).toFixed(2)}</div>
                </div>
                <div className="ctrl-arrow">→</div>
                <div className="ctrl-price-box suggested">
                  <div className="ctrl-label">AI Suggested</div>
                  <div className="ctrl-val" style={{ color: suggested > product.current_price ? 'var(--red)' : 'var(--green)' }}>
                    ${suggested.toFixed(2)}
                  </div>
                </div>
              </div>
              <RippleBtn className="ctrl-btn primary"
                onClick={() => showToast(`✅ Applied AI price $${suggested.toFixed(2)} to ${product.name}`)}>
                🤖 Apply AI Recommendation
              </RippleBtn>
              <div className="ctrl-row">
                <div className={`ctrl-toggle ${locked ? 'on' : ''}`} onClick={() => { setLocked(l => !l); showToast(locked ? '🔓 Price lock removed' : '🔒 Price locked!', 'info'); }}>
                  <motion.div className="ctrl-toggle-knob" animate={{ x: locked ? 22 : 2 }} />
                </div>
                <span>🔒 Lock Price</span>
              </div>
              <div className="ctrl-row">
                <div className={`ctrl-toggle ${auto ? 'on' : ''}`} onClick={() => { setAuto(a => !a); showToast(auto ? '⏸ Auto mode off' : '🚀 Auto mode active!', 'info'); }}>
                  <motion.div className="ctrl-toggle-knob" animate={{ x: auto ? 22 : 2 }} />
                </div>
                <span>⚡ Auto Pricing Mode</span>
              </div>
            </div>
          )}

          {tab === 'Competitor' && (
            <div className="comp-tab">
              {[
                { label: 'Our Price', val: Number(product.current_price), col: 'var(--purple)' },
                { label: 'Competitor', val: Number(product.competitor_price || product.base_price * 1.05), col: 'var(--blue)' },
                { label: 'Base Price', val: Number(product.base_price), col: 'var(--text3)' },
              ].map(({ label, val, col }) => {
                const maxVal = Math.max(Number(product.current_price), Number(product.competitor_price || 0), Number(product.base_price)) * 1.1;
                return (
                  <div key={label} className="comp-row">
                    <div className="comp-row-label">{label}</div>
                    <div className="comp-bar-bg">
                      <motion.div className="comp-bar-fill" style={{ background: col }}
                        initial={{ width: 0 }} animate={{ width: `${(val / maxVal) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }} />
                    </div>
                    <div className="comp-val" style={{ color: col }}>${val.toFixed(2)}</div>
                  </div>
                );
              })}
              {product.competitor_price && (
                <div className="comp-status" style={{
                  color: product.current_price > product.competitor_price ? 'var(--red)' : 'var(--green)'
                }}>
                  {product.current_price > product.competitor_price
                    ? `⚠️ We're ${(((product.current_price - product.competitor_price) / product.competitor_price) * 100).toFixed(1)}% pricier than competitor`
                    : `✅ We're ${(((product.competitor_price - product.current_price) / product.competitor_price) * 100).toFixed(1)}% cheaper than competitor`}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
const containerVar = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

export default function Dashboard() {
  const { products, priceEvents, alerts } = usePricing();
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  const selected = products.find(p => p.id === selectedId);
  const critAlerts = alerts.filter(a => a.severity === 'high').slice(0, 2);
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selectedId) return;
    fetch(`${API_URL}/products/${selectedId}/history?limit=40`)
      .then(r => r.json()).then(d => setHistory((d.history || []).reverse())).catch(() => {});
  }, [selectedId, products]);

  const surges = products.filter(p => p.current_price > p.base_price * 1.01).length;
  const drops = products.filter(p => p.current_price < p.base_price * 0.99).length;
  const avg = products.length ? (products.reduce((s, p) => s + Number(p.current_price), 0) / products.length).toFixed(2) : '0.00';

  return (
    <div className="page-wrap">
      {/* KPI Row */}
      <motion.div className="kpi-row" variants={containerVar} initial="hidden" animate="show">
        {[
          { icon: '📦', label: 'Total Products', val: products.length, col: 'rgba(59,130,246,.18)', glow: 'rgba(59,130,246,.3)' },
          { icon: '🔥', label: 'Active Surges', val: surges, col: 'rgba(244,63,94,.18)', glow: 'rgba(244,63,94,.3)' },
          { icon: '💚', label: 'Active Drops', val: drops, col: 'rgba(16,185,129,.18)', glow: 'rgba(16,185,129,.3)' },
          { icon: '💰', label: 'Avg Price', val: `$${avg}`, col: 'rgba(139,92,246,.18)', glow: 'rgba(139,92,246,.4)' },
        ].map(({ icon, label, val, col, glow }) => (
          <motion.div key={label} className="kpi-card" variants={cardVariants}
            whileHover={{ y: -4, boxShadow: `0 12px 32px ${glow}` }}
            style={{ '--card-glow': glow }}>
            <div className="kpi-icon" style={{ background: col }}>{icon}</div>
            <div>
              <div className="kpi-label">{label}</div>
              <div className="kpi-val">{val}</div>
            </div>
            <div className="kpi-shimmer" />
          </motion.div>
        ))}
      </motion.div>

      {/* Alerts Banner */}
      <AnimatePresence>
        {critAlerts.length > 0 && (
          <motion.div className="alert-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            🔴 {critAlerts.map(a => a.msg).join('  ·  ')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticker */}
      {products.length > 0 && (
        <div className="ticker-wrap">
          <div className="ticker-track">
            {[...products, ...products].map((p, i) => {
              const c = ((p.current_price - p.base_price) / p.base_price * 100);
              return (
                <span key={i} className={`ticker-item ${c > 1 ? 'up' : c < -1 ? 'dn' : ''}`}>
                  {p.name.split(' ').slice(0, 2).join(' ')} <strong>${Number(p.current_price).toFixed(2)}</strong> {c > 0 ? '▲' : '▼'}{Math.abs(c).toFixed(1)}%&nbsp;&nbsp;·&nbsp;&nbsp;
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Market Mood + Price Events */}
      <div className="dash-meta-row">
        <MarketMood products={products} />
        {priceEvents.length > 0 && (
          <div className="event-feed-mini">
            <div className="ef-title">⚡ Recent Changes</div>
            {priceEvents.slice(0, 4).map(ev => (
              <motion.div key={ev.id} className={`ef-item ${ev.dir}`}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                {ev.name.split(' ').slice(0, 2).join(' ')} {ev.dir === 'up' ? '▲' : '▼'} ${Math.abs(ev.new - ev.old).toFixed(2)}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="dash-grid">
        {/* Products col */}
        <div>
          <div className="col-header">
            <h2>🛍️ Live Store</h2>
            <input className="search-input" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <motion.div className="product-grid" variants={containerVar} initial="hidden" animate="show">
            {filtered.map(p => (
              <motion.div key={p.id} variants={cardVariants}>
                <ProductCard product={p} isSelected={selectedId === p.id}
                  onClick={() => setSelectedId(prev => prev === p.id ? null : p.id)} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Detail col */}
        <div className="detail-col">
          <AnimatePresence mode="wait">
            {selected ? (
              <DetailPanel key={selected.id} product={selected} history={history} onClose={() => setSelectedId(null)} />
            ) : (
              <motion.div key="empty" className="empty-panel"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="ep-orb" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>📊</motion.div>
                <h3>Select a Product</h3>
                <p>Click any product to see live pricing analytics, AI reasoning, and override controls</p>
                <div className="ep-dots"><span /><span /><span /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
