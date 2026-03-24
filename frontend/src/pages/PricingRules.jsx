import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePricing } from '../context/PricingContext.jsx';

const LS_KEY = 'pp_rules';
const DEFAULTS = {
  maxSurge: 12, maxDrop: 12, updateInterval: 30,
  strategy: 'balanced',
  categories: {}
};

const STRATEGIES = [
  { id: 'aggressive', label: '🔥 Aggressive', desc: 'Maximize revenue — price high when demand peaks' },
  { id: 'balanced', label: '⚖️ Balanced', desc: 'Steady optimization with moderate adjustments' },
  { id: 'conservative', label: '🛡️ Conservative', desc: 'Minimal changes — prioritize price stability' },
  { id: 'competitor', label: '⚔️ Match Competitor', desc: 'Stay within 2% of competitor pricing' },
];

export default function PricingRules() {
  const { products } = usePricing();
  const [rules, setRules] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') }; } catch { return DEFAULTS; }
  });
  const [saved, setSaved] = useState(false);

  const categories = [...new Set(products.map(p => p.category))];

  const update = (key, val) => setRules(r => ({ ...r, [key]: val }));
  const updateCat = (cat, key, val) => setRules(r => ({ ...r, categories: { ...r.categories, [cat]: { ...(r.categories[cat] || {}), [key]: val } } }));

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(rules));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="page-wrap">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">⚙️ Pricing Rules</h1>
          <p className="page-sub">Configure limits, strategy, and per-category rules</p>
        </div>
        <motion.button className="save-btn" onClick={save}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          animate={saved ? { background: 'var(--green)' } : {}}>
          {saved ? '✅ Saved!' : '💾 Save Rules'}
        </motion.button>
      </div>

      {/* Global Limits */}
      <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="chart-card-title">🌐 Global Price Limits</h3>
        <div className="rules-row">
          {[
            { key: 'maxSurge', label: '📈 Max Surge', unit: '%', min: 1, max: 25 },
            { key: 'maxDrop', label: '📉 Max Drop', unit: '%', min: 1, max: 25 },
            { key: 'updateInterval', label: '⏱ Update Interval', unit: 's', min: 10, max: 300 },
          ].map(({ key, label, unit, min, max }) => (
            <div key={key} className="rule-slider-card">
              <div className="rule-slider-top">
                <span>{label}</span>
                <span className="rule-val" style={{ fontFamily: 'var(--mono)', color: 'var(--purple2)', fontWeight: 700 }}>
                  {rules[key]}{unit}
                </span>
              </div>
              <input type="range" min={min} max={max} value={rules[key]}
                onChange={e => update(key, Number(e.target.value))}
                className="rule-slider" />
              <div className="rule-slider-ends" style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{min}{unit}</span><span>{max}{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Strategy */}
      <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="chart-card-title">🎯 Pricing Strategy</h3>
        <div className="strategy-grid">
          {STRATEGIES.map(s => (
            <motion.div key={s.id}
              className={`strategy-card ${rules.strategy === s.id ? 'active' : ''}`}
              onClick={() => update('strategy', s.id)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <div className="strategy-label">{s.label}</div>
              <div className="strategy-desc">{s.desc}</div>
              {rules.strategy === s.id && (
                <motion.div className="strategy-check" layoutId="strategy-check">✓</motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Per-Category */}
      {categories.length > 0 && (
        <motion.div className="glass-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="chart-card-title">🏷️ Category Overrides</h3>
          <div className="cat-rules-grid">
            {categories.map((cat, i) => {
              const catRule = rules.categories[cat] || {};
              return (
                <motion.div key={cat} className="cat-rule-card"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <div className="cat-rule-name">{cat}</div>
                  <div className="cat-rule-row">
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Max Surge</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--red)', fontWeight: 700 }}>{catRule.maxSurge || rules.maxSurge}%</span>
                  </div>
                  <input type="range" min={1} max={25} value={catRule.maxSurge || rules.maxSurge}
                    onChange={e => updateCat(cat, 'maxSurge', Number(e.target.value))} className="rule-slider" />
                  <div className="cat-rule-row" style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Max Drop</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--green)', fontWeight: 700 }}>{catRule.maxDrop || rules.maxDrop}%</span>
                  </div>
                  <input type="range" min={1} max={25} value={catRule.maxDrop || rules.maxDrop}
                    onChange={e => updateCat(cat, 'maxDrop', Number(e.target.value))} className="rule-slider" />
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
