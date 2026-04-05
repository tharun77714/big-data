import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export const API_URL = '/api';
const _wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL = `${_wsProto}://${window.location.host}/ws/prices`;
const STATS_WS_URL = `${_wsProto}://${window.location.host}/ws/dashboard`;

const PricingContext = createContext(null);

export function PricingProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [priceEvents, setPriceEvents] = useState([]);
  const prevPricesRef = useRef({});



  useEffect(() => {
    let wsRetry, statsRetry;

    function connectWS() {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); wsRetry = setTimeout(connectWS, 3000); };
      ws.onerror = () => ws.close();
      ws.onmessage = e => {
        const data = JSON.parse(e.data);
        if (data.type === 'price_update') {
          setProducts(prev => {
            const events = [];
            data.products.forEach(p => {
              const old = prevPricesRef.current[p.id];
              if (old && Math.abs(p.current_price - old) > 0.01) {
                events.push({ id: `${p.id}-${Date.now()}`, productId: p.id, name: p.name,
                  old, new: p.current_price, dir: p.current_price > old ? 'up' : 'down', time: new Date() });
              }
              prevPricesRef.current[p.id] = p.current_price;
            });
            if (events.length) setPriceEvents(ev => [...events, ...ev].slice(0, 15));
            return data.products;
          });
        }
      };
      return ws;
    }

    function connectStats() {
      const ws = new WebSocket(STATS_WS_URL);
      ws.onerror = () => ws.close();
      ws.onclose = () => { statsRetry = setTimeout(connectStats, 3000); };
      ws.onmessage = e => {
        const d = JSON.parse(e.data);
        if (d.type === 'dashboard_update') setStats(d.data);
      };
      return ws;
    }

    const w1 = connectWS();
    const w2 = connectStats();

    fetch(`${API_URL}/products`).then(r => r.json()).then(d => {
      const prods = d.products || [];
      setProducts(prods);
      const m = {};
      prods.forEach(p => { m[p.id] = p.current_price; });
      prevPricesRef.current = m;
    }).catch(console.error);

    return () => {
      clearTimeout(wsRetry); clearTimeout(statsRetry);
      try { w1.close(); } catch {}
      try { w2.close(); } catch {}
    };
  }, []);

  return (
    <PricingContext.Provider value={{ products, stats, connected, priceEvents, API_URL }}>
      {children}
    </PricingContext.Provider>
  );
}

export const usePricing = () => useContext(PricingContext);
