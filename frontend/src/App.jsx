import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_URL = 'http://10.235.174.241:8000/api';
const WS_URL = 'ws://10.235.174.241:8000/ws/prices';
const STATS_WS_URL = 'ws://10.235.174.241:8000/ws/dashboard';

// ─── Animated Price ─────────────────────────────────────────────────
const AnimatedPrice = ({ value, prevValue }) => {
  const [flash, setFlash] = useState('');
  useEffect(() => {
    if (prevValue && value !== prevValue) {
      setFlash(value > prevValue ? 'price-flash-up' : 'price-flash-down');
      const t = setTimeout(() => setFlash(''), 1500);
      return () => clearTimeout(t);
    }
  }, [value, prevValue]);
  return <span className={`price-value ${flash}`}>${Number(value).toFixed(2)}</span>;
};

// ─── Product Card ───────────────────────────────────────────────────
const ProductCard = ({ product, onClick, prevPrice }) => {
  const changePct = ((product.current_price - product.base_price) / product.base_price * 100);
  const isSurge = changePct > 1;
  const isDrop = changePct < -1;

  const statusClass = isSurge ? 'surging' : isDrop ? 'dropping' : 'stable';
  const badgeClass = isSurge ? 'badge-surge' : isDrop ? 'badge-drop' : 'badge-stable';
  const badgeText = isSurge ? '▲ SURGE' : isDrop ? '▼ DROP' : '● STABLE';

  return (
    <div className={`product-card ${statusClass}`} onClick={onClick}>
      <div className="card-image">
        <img
          src={product.image_url}
          alt={product.name}
          onError={(e) => { e.target.src = `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80`; }}
        />
        <div className="card-image-overlay" />
        <span className={`price-badge ${badgeClass}`}>{badgeText}</span>
      </div>

      <div className="card-body">
        <span className="card-category">{product.category}</span>
        <h3 className="card-name">{product.name}</h3>

        <div className="card-price-row">
          <div>
            <div className="price-label">Live Price</div>
            <AnimatedPrice value={product.current_price} prevValue={prevPrice} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="price-label">Change</div>
            <span className={`price-change ${changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat'}`}>
              {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="card-meta">
          <span>Base: ${Number(product.base_price).toFixed(2)}</span>
          <span>Demand: {(product.demand_score || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ──────────────────────────────────────────────────────
const StatCard = ({ icon, color, label, value }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="stat-info">
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  </div>
);

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [connected, setConnected] = useState(false);
  const prevPricesRef = useRef({});

  // WebSocket connections
  useEffect(() => {
    let wsRetry, statsRetry;

    function connectWS() {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        wsRetry = setTimeout(connectWS, 3000);
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'price_update') {
          setProducts(prev => {
            const priceMap = {};
            prev.forEach(p => { priceMap[p.id] = p.current_price; });
            prevPricesRef.current = priceMap;
            return data.products;
          });
        }
      };
      return ws;
    }

    function connectStats() {
      const ws = new WebSocket(STATS_WS_URL);
      ws.onclose = () => { statsRetry = setTimeout(connectStats, 3000); };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'dashboard_update') setStats(data.data);
      };
      return ws;
    }

    const ws1 = connectWS();
    const ws2 = connectStats();

    return () => {
      clearTimeout(wsRetry);
      clearTimeout(statsRetry);
      try { ws1.close(); } catch(e) {}
      try { ws2.close(); } catch(e) {}
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(console.error);
  }, []);

  // Fetch history for selected product
  useEffect(() => {
    if (selectedId) {
      fetch(`${API_URL}/products/${selectedId}/history?limit=30`)
        .then(r => r.json())
        .then(d => setHistory((d.history || []).reverse()))
        .catch(console.error);
    }
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
    <div className="app-container">

      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h1>PulsePrice</h1>
            <p>ML-Powered Dynamic Pricing</p>
          </div>
        </div>
        <div className="header-controls">
          <div className="status-badge">
            <span className={`status-dot ${connected ? 'live' : 'offline'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div className="stats-row">
        <StatCard icon="📦" color="blue" label="Total Products" value={products.length} />
        <StatCard icon="🔥" color="red" label="Active Surges" value={surgeCount} />
        <StatCard icon="💚" color="green" label="Active Drops" value={dropCount} />
        <StatCard icon="💰" color="purple" label="Avg Price" value={`$${avgPrice}`} />
      </div>

      {/* ── Main Layout ── */}
      <div className="main-layout">

        {/* Left: Product Grid */}
        <div>
          <div className="section-header">
            <h2>🛍️ Live Store</h2>
            <span className="subtitle">Updates every 5s via WebSocket</span>
          </div>
          <div className="product-grid">
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                prevPrice={prevPricesRef.current[p.id]}
                onClick={() => setSelectedId(p.id)}
              />
            ))}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div>
          {selected ? (
            <div className="detail-panel" style={{
              borderTop: `3px solid ${
                selected.current_price > selected.base_price * 1.01 ? 'var(--surge-red)' :
                selected.current_price < selected.base_price * 0.99 ? 'var(--drop-green)' :
                'var(--stable-blue)'
              }`
            }}>
              <div className="detail-header">
                <div>
                  <h2>{selected.name}</h2>
                  <p className="sub">#{selected.id} · {selected.category}</p>
                </div>
                <button className="close-btn" onClick={() => setSelectedId(null)}>✕</button>
              </div>

              <div className="detail-stats">
                <div className="detail-stat">
                  <label>Current Price</label>
                  <div className="value" style={{
                    color: selected.current_price > selected.base_price ? 'var(--surge-red)' :
                           selected.current_price < selected.base_price ? 'var(--drop-green)' : 'inherit'
                  }}>
                    ${Number(selected.current_price).toFixed(2)}
                  </div>
                </div>
                <div className="detail-stat">
                  <label>Base Price</label>
                  <div className="value">${Number(selected.base_price).toFixed(2)}</div>
                </div>
                <div className="detail-stat">
                  <label>Demand Score</label>
                  <div className="value" style={{ color: 'var(--accent-blue)' }}>
                    {(selected.demand_score || 0).toFixed(3)}
                  </div>
                </div>
                <div className="detail-stat">
                  <label>Stock Level</label>
                  <div className="value">{selected.stock_level}</div>
                </div>
                <div className="detail-stat">
                  <label>Price Change</label>
                  <div className="value" style={{
                    color: selected.current_price > selected.base_price ? 'var(--surge-red)' :
                           selected.current_price < selected.base_price ? 'var(--drop-green)' : 'inherit'
                  }}>
                    {(((selected.current_price - selected.base_price) / selected.base_price) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="detail-stat">
                  <label>Competitor</label>
                  <div className="value">${Number(selected.competitor_price || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="chart-section">
                <h3>📈 Price History (Live)</h3>
                <div className="chart-container">
                  {history.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                        <XAxis
                          dataKey="recorded_at"
                          tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          stroke="var(--text-muted)"
                          fontSize={10}
                          fontFamily="var(--font-mono)"
                          tickMargin={8}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          stroke="var(--text-muted)"
                          fontSize={10}
                          fontFamily="var(--font-mono)"
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px'
                          }}
                          labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                          formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Price']}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="var(--accent-purple)"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{
                      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px'
                    }}>
                      Collecting data points...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <div className="icon">📊</div>
              <p>Click any product to view real-time pricing analytics and history charts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
