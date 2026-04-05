import { motion, AnimatePresence } from 'framer-motion';
import { usePricing } from '../context/PricingContext.jsx';

const ICONS = { demand: '🔥', surge: '📈' };
const SEV_COL = { high: 'var(--red)', medium: 'var(--purple)', info: 'var(--blue)' };

export default function Alerts() {
  const { alerts, products } = usePricing();

  const highAlerts = alerts.filter(a => a.severity === 'high');
  const medAlerts = alerts.filter(a => a.severity === 'medium');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  const Section = ({ title, items, col }) => (
    items.length > 0 && (
      <div className="alert-section">
        <div className="alert-section-title" style={{ color: col }}>{title} <span className="alert-count">{items.length}</span></div>
        <AnimatePresence>
          {items.map((a, i) => (
            <motion.div key={a.id} className="alert-item"
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
              style={{ '--alert-col': col }}>
              <div className="alert-icon" style={{ background: `${col}22`, color: col }}>{ICONS[a.type]}</div>
              <div className="alert-body">
                <div className="alert-msg">{a.msg}</div>
                <div className="alert-detail">{a.detail}</div>
                <div className="alert-meta">
                  <span className="alert-product-tag">{a.product.category}</span>
                  <span className="alert-price">${Number(a.product.current_price).toFixed(2)}</span>
                </div>
              </div>
              <div className="alert-severity" style={{ background: `${col}22`, color: col }}>
                {a.severity.toUpperCase()}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  );

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">🔔 Alerts</h1>
        <p className="page-sub">Real-time market event detection</p>
      </div>

      {/* Summary Badges */}
      <motion.div className="alert-summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {[
          { label: 'Critical', count: highAlerts.length, col: 'var(--red)' },
          { label: 'Medium', count: medAlerts.length, col: 'var(--purple)' },
          { label: 'Info', count: infoAlerts.length, col: 'var(--blue)' },
          { label: 'Total', count: alerts.length, col: 'var(--text2)' },
        ].map(({ label, count, col }) => (
          <div key={label} className="alert-badge" style={{ '--badge-col': col }}>
            <div className="alert-badge-count" style={{ color: col }}>{count}</div>
            <div className="alert-badge-label">{label}</div>
          </div>
        ))}
      </motion.div>

      {alerts.length === 0 ? (
        <motion.div className="empty-panel" style={{ marginTop: 32 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="ep-orb" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>✅</motion.div>
          <h3>All clear!</h3>
          <p>No active alerts. Market is stable across all products.</p>
        </motion.div>
      ) : (
        <div className="alert-list">
          <Section title="🔴 Critical" items={highAlerts} col="var(--red)" />
          <Section title="🟡 Medium Priority" items={medAlerts} col="var(--purple)" />
          <Section title="🔵 Informational" items={infoAlerts} col="var(--blue)" />
        </div>
      )}
    </div>
  );
}
