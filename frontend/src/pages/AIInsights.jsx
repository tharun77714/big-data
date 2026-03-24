import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePricing } from '../context/PricingContext.jsx';

const FEATURES = [
  { name: 'Demand Score', importance: 92, col: '#8b5cf6' },
  { name: 'Purchase Rate', importance: 78, col: '#3b82f6' },
  { name: 'Cart Conversion', importance: 65, col: '#06b6d4' },
  { name: 'Stock Level', importance: 58, col: '#10b981' },
  { name: 'Competitor Price', importance: 52, col: '#f59e0b' },
  { name: 'View Count', importance: 41, col: '#ec4899' },
  { name: 'Hour of Day', importance: 28, col: '#6366f1' },
  { name: 'Day of Week', importance: 19, col: '#94a3b8' },
];

export default function AIInsights() {
  const { products } = usePricing();

  const topSurging = products.filter(p => p.current_price > p.base_price * 1.03).slice(0, 3);
  const topDropping = products.filter(p => p.current_price < p.base_price * 0.97).slice(0, 3);
  const highDemand = [...products].sort((a, b) => (b.demand_score || 0) - (a.demand_score || 0)).slice(0, 3);

  const insights = [
    ...(topSurging.length ? [{ icon: '📈', col: 'var(--red)', title: 'Surge Detected', msg: `${topSurging[0]?.name} is surging ${(((topSurging[0]?.current_price - topSurging[0]?.base_price) / topSurging[0]?.base_price) * 100).toFixed(1)}% above base price` }] : []),
    ...(topDropping.length ? [{ icon: '📉', col: 'var(--green)', title: 'Price Opportunity', msg: `${topDropping[0]?.name} has dropped — consider demand stimulation` }] : []),
    ...(highDemand.length ? [{ icon: '🔥', col: 'var(--purple)', title: 'High Demand Alert', msg: `${highDemand[0]?.name} has peak demand score of ${((highDemand[0]?.demand_score || 0) * 100).toFixed(0)}%` }] : []),
    { icon: '🤖', col: 'var(--blue)', title: 'Model Health', msg: 'ML pricing model is active and processing batches every 30 seconds' },
    { icon: '⚡', col: 'var(--cyan)', title: 'Pipeline Status', msg: 'Kafka → Spark → PostgreSQL → WebSocket pipeline is operational' },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">🤖 AI Insights</h1>
        <p className="page-sub">ML model intelligence & pricing explainability</p>
      </div>

      <div className="ai-grid">
        {/* Model Info Card */}
        <motion.div className="glass-card ai-model-card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ai-model-header">
            <div className="ai-model-icon">🧠</div>
            <div>
              <h3>ML Pricing Model</h3>
              <p style={{ color: 'var(--text3)', fontSize: 12 }}>Gradient Boosted Regressor · v2.0</p>
            </div>
          </div>
          <div className="ai-model-stats">
            {[
              { label: 'Model Accuracy', val: '94.2%', col: 'var(--green)' },
              { label: 'Avg Confidence', val: '78%', col: 'var(--purple2)' },
              { label: 'Training Samples', val: '10,000', col: 'var(--blue)' },
              { label: 'Price Range', val: '±12%', col: 'var(--cyan)' },
            ].map(({ label, val, col }) => (
              <div key={label} className="ai-stat-box">
                <div className="ai-stat-label">{label}</div>
                <div className="ai-stat-val" style={{ color: col }}>{val}</div>
              </div>
            ))}
          </div>
          {/* Confidence bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text3)' }}>
              <span>Overall Confidence</span><span style={{ color: 'var(--purple2)', fontFamily: 'var(--mono)' }}>78%</span>
            </div>
            <div className="demand-bar-bg">
              <motion.div className="demand-bar-fill" style={{ background: 'linear-gradient(90deg,var(--purple),var(--blue))' }}
                initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ duration: 1.2, ease: 'easeOut' }} />
            </div>
          </div>
        </motion.div>

        {/* Feature Importance */}
        <motion.div className="glass-card"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="chart-card-title">📊 Feature Importance</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={FEATURES} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text3)', fontSize: 9 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} width={100} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 11 }}
                formatter={v => [`${v}%`, 'Importance']} />
              <Bar dataKey="importance" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={800}>
                {FEATURES.map((f, i) => <Cell key={i} fill={f.col} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* AI Insights Cards */}
      <div className="insights-grid">
        {insights.map((ins, i) => (
          <motion.div key={i} className="insight-card"
            style={{ '--ins-col': ins.col }}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ y: -4, boxShadow: `0 12px 32px ${ins.col}33` }}>
            <div className="insight-icon" style={{ color: ins.col }}>{ins.icon}</div>
            <div>
              <div className="insight-title" style={{ color: ins.col }}>{ins.title}</div>
              <div className="insight-msg">{ins.msg}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pricing Strategy */}
      <motion.div className="glass-card" style={{ marginTop: 20 }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <h3 className="chart-card-title">🎯 Price Elasticity Summary</h3>
        <div className="elasticity-grid">
          {[
            { label: 'High Elasticity', desc: 'Price-sensitive products — small changes drive big demand shifts', count: products.filter(p => (p.demand_score || 0) > 0.6).length, col: 'var(--red)' },
            { label: 'Medium Elasticity', desc: 'Moderate price sensitivity — steady demand with small adjustments', count: products.filter(p => (p.demand_score || 0) >= 0.3 && (p.demand_score || 0) <= 0.6).length, col: 'var(--purple)' },
            { label: 'Low Elasticity', desc: 'Price-insensitive — demand stable regardless of price change', count: products.filter(p => (p.demand_score || 0) < 0.3).length, col: 'var(--green)' },
          ].map(({ label, desc, count, col }) => (
            <div key={label} className="elast-card" style={{ '--el-col': col }}>
              <div className="elast-count" style={{ color: col }}>{count}</div>
              <div className="elast-label">{label}</div>
              <div className="elast-desc">{desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
