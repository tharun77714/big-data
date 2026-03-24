import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePricing } from '../context/PricingContext.jsx';

const NAV = [
  { to: '/',         icon: '🏠', label: 'Dashboard',     exact: true },
  { to: '/analytics',icon: '📊', label: 'Analytics' },
  { to: '/alerts',   icon: '🔔', label: 'Alerts',        badge: true },
  { to: '/ai',       icon: '🤖', label: 'AI Insights' },
  { to: '/rules',    icon: '⚙️', label: 'Pricing Rules' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { alerts, connected } = usePricing();
  const alertCount = alerts.filter(a => a.severity === 'high').length;

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-orb">⚡</div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span className="sb-brand"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              PulsePrice
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {NAV.map(({ to, icon, label, badge, exact }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) => `sb-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div className="sb-active-bg" layoutId="sb-active"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="sb-icon">{icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span className="sb-label"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}>
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {badge && alertCount > 0 && (
                  <motion.span className="sb-badge" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    {alertCount}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <div className={`sb-conn ${connected ? 'live' : 'off'}`}>
          <span className="sb-conn-dot" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {connected ? 'Live' : 'Offline'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button className="sb-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          <motion.span animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>›</motion.span>
        </button>
      </div>
    </motion.aside>
  );
}
