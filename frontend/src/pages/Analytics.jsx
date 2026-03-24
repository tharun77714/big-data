import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { usePricing, API_URL } from '../context/PricingContext.jsx';

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#ec4899', '#6366f1'];

function ChartCard({ title, children }) {
  return (
    <motion.div className="chart-card"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(139,92,246,.15)' }}>
      <h3 className="chart-card-title">{title}</h3>
      {children}
    </motion.div>
  );
}

export default function Analytics() {
  const { products } = usePricing();
  const [historyData, setHistoryData] = useState([]);

  // Aggregate category data
  const categoryMap = {};
  products.forEach(p => {
    if (!categoryMap[p.category]) categoryMap[p.category] = { name: p.category, surges: 0, drops: 0, stable: 0, count: 0, totalPrice: 0 };
    const chg = ((p.current_price - p.base_price) / p.base_price * 100);
    if (chg > 1) categoryMap[p.category].surges++;
    else if (chg < -1) categoryMap[p.category].drops++;
    else categoryMap[p.category].stable++;
    categoryMap[p.category].count++;
    categoryMap[p.category].totalPrice += Number(p.current_price);
  });
  const catData = Object.values(categoryMap);

  // Scatter: demand vs price change
  const scatterData = products.map(p => ({
    x: parseFloat(((p.demand_score || 0) * 100).toFixed(1)),
    y: parseFloat(((p.current_price - p.base_price) / p.base_price * 100).toFixed(2)),
    name: p.name,
  }));

  // Top movers
  const topMovers = [...products]
    .sort((a, b) => Math.abs((b.current_price - b.base_price) / b.base_price) - Math.abs((a.current_price - a.base_price) / a.base_price))
    .slice(0, 8);

  // Avg price bar by category
  const avgPriceData = catData.map(c => ({ name: c.name.split(' ')[0], avgPrice: parseFloat((c.totalPrice / c.count).toFixed(2)) }));

  // Fetch some history for trend
  useEffect(() => {
    if (products.length === 0) return;
    const pid = products[0]?.id;
    if (!pid) return;
    fetch(`${API_URL}/products/${pid}/history?limit=30`)
      .then(r => r.json())
      .then(d => {
        const arr = (d.history || []).reverse().map((h, i) => ({
          t: i, price: parseFloat(Number(h.price).toFixed(2)), time: h.recorded_at
        }));
        setHistoryData(arr);
      }).catch(() => {});
  }, [products]);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">📊 Analytics</h1>
        <p className="page-sub">Market performance & pricing intelligence</p>
      </div>

      <div className="analytics-grid">
        {/* Category Surge/Drop */}
        <ChartCard title="🏷️ Category Performance">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="surges" name="Surges" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="drops" name="Drops" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stable" name="Stable" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Price Trend */}
        <ChartCard title="📈 Price Trend (Top Product)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text3)', fontSize: 10 }} tickFormatter={v => `$${v}`} width={52} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12 }}
                formatter={v => [`$${Number(v).toFixed(2)}`, 'Price']} />
              <Area type="monotone" dataKey="price" stroke="#8b5cf6" strokeWidth={2.5}
                fill="url(#trendGrad)" dot={false} isAnimationActive animationDuration={600} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Demand vs Price Score Scatter */}
        <ChartCard title="🎯 Demand vs Price Change">
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="x" name="Demand %" type="number" domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 10 }} label={{ value: 'Demand %', position: 'insideBottom', offset: -2, fill: 'var(--text3)', fontSize: 10 }} />
              <YAxis dataKey="y" name="Price Chg %" type="number" tick={{ fill: 'var(--text3)', fontSize: 10 }} tickFormatter={v => `${v}%`} width={40} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 11 }}
                formatter={(v, n) => [n === 'Demand %' ? `${v}%` : `${v}%`, n]} />
              <Scatter data={scatterData} isAnimationActive>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.y > 0 ? '#f43f5e' : '#10b981'} fillOpacity={0.75} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Avg Price by Category */}
        <ChartCard title="💰 Avg Price by Category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={avgPriceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} width={64} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12 }} formatter={v => [`$${v}`, 'Avg Price']} />
              <Bar dataKey="avgPrice" radius={[0, 6, 6, 0]} isAnimationActive>
                {avgPriceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top Movers Table */}
      <motion.div className="chart-card" style={{ marginTop: 20 }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="chart-card-title">🏆 Top Price Movers</h3>
        <div className="movers-table">
          <div className="movers-header">
            <span>Product</span><span>Category</span><span>Base</span><span>Current</span><span>Change</span>
          </div>
          {topMovers.map((p, i) => {
            const chg = ((p.current_price - p.base_price) / p.base_price * 100);
            return (
              <motion.div key={p.id} className="movers-row"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}>
                <span className="mover-name">{p.name}</span>
                <span className="mover-cat">{p.category}</span>
                <span style={{ fontFamily: 'var(--mono)' }}>${Number(p.base_price).toFixed(2)}</span>
                <span style={{ fontFamily: 'var(--mono)' }}>${Number(p.current_price).toFixed(2)}</span>
                <span className={`pcard-change ${chg > 1 ? 'up' : chg < -1 ? 'dn' : 'flat'}`} style={{ padding: '2px 10px' }}>
                  {chg > 0 ? '+' : ''}{chg.toFixed(1)}%
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
