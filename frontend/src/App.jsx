import { Routes, Route } from 'react-router-dom';
import { PricingProvider } from './context/PricingContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';

import AIInsights from './pages/AIInsights.jsx';
import PricingRules from './pages/PricingRules.jsx';

export default function App() {
  return (
    <PricingProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />

          <Route path="ai" element={<AIInsights />} />
          <Route path="rules" element={<PricingRules />} />
        </Route>
      </Routes>
    </PricingProvider>
  );
}
