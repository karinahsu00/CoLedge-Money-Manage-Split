const express = require('express');

const router = express.Router();

// In-memory cache: key -> { rate, expiresAt }
const cache = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

const getCached = (from, to) => {
  const key = `${from}->${to}`;
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) return null;
  return hit.rate;
};

const setCached = (from, to, rate) => {
  const key = `${from}->${to}`;
  cache.set(key, { rate, expiresAt: Date.now() + TTL_MS });
};

// Fallback static rates if APIs fail
const STATIC_RATES = {
  'USD->TWD': 32.2,
  'TWD->USD': 1 / 32.2,
  'EUR->TWD': 35.0,
  'TWD->EUR': 1 / 35.0,
  'JPY->TWD': 0.21,
  'TWD->JPY': 1 / 0.21,
};

// Provider 1: open.er-api.com (free, no key; broad currency coverage)
const fetchRateErApi = async (from, to) => {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;
  const resp = await fetch(url);

  if (!resp.ok) {
    const details = await resp.text().catch(() => '');
    throw new Error(`er-api error ${resp.status}: ${details}`);
  }

  const json = await resp.json();
  if (json?.result && json.result !== 'success') {
    throw new Error(`er-api non-success result: ${JSON.stringify(json)}`);
  }

  const rate = json?.rates?.[to];
  if (!rate || Number.isNaN(Number(rate))) {
    throw new Error(`er-api missing rate for ${to}`);
  }

  return Number(rate);
};

// Provider 2: Frankfurter (ECB-based; limited currencies)
const fetchRateFrankfurter = async (from, to) => {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const resp = await fetch(url);

  if (!resp.ok) {
    const details = await resp.text().catch(() => '');
    throw new Error(`frankfurter error ${resp.status}: ${details}`);
  }

  const json = await resp.json();
  const rate = json?.rates?.[to];

  if (!rate || Number.isNaN(Number(rate))) {
    throw new Error('frankfurter missing rate');
  }

  return Number(rate);
};

// GET /api/fx/rate?from=USD&to=TWD
router.get('/rate', async (req, res) => {
  try {
    let from = String(req.query.from || '').toUpperCase();
    let to = String(req.query.to || '').toUpperCase();

    // Map NTD to TWD for standard APIs
    if (from === 'NTD') from = 'TWD';
    if (to === 'NTD') to = 'TWD';

    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    if (from === to) return res.json({ from, to, rate: 1, source: 'identity' });

    const cached = getCached(from, to);
    if (cached != null) return res.json({ from, to, rate: cached, source: 'cache' });

    // Try er-api first
    try {
      const rate = await fetchRateErApi(from, to);
      setCached(from, to, rate);
      return res.json({ from, to, rate, source: 'open.er-api.com' });
    } catch (e1) {
      // Fallback to frankfurter for currencies it supports
      try {
        const rate = await fetchRateFrankfurter(from, to);
        setCached(from, to, rate);
        return res.json({ from, to, rate, source: 'frankfurter' });
      } catch (e2) {
        // Try static fallback
        const staticKey = `${from}->${to}`;
        const staticRate = STATIC_RATES[staticKey];
        if (staticRate) {
          return res.json({ from, to, rate: staticRate, source: 'static-fallback' });
        }

        // Both failed and no fallback: return 502 with both errors
        // But before we fail entirely, return a hardcoded failsafe if TWD is involved
        if (to === 'TWD' && from === 'USD') return res.json({ from, to, rate: 32.2, source: 'failsafe-fallback' });
        if (from === 'TWD' && to === 'USD') return res.json({ from, to, rate: 1 / 32.2, source: 'failsafe-fallback' });

        return res.status(502).json({
          error: 'fx provider error',
          providers: {
            'open.er-api.com': String(e1?.message || e1),
            frankfurter: String(e2?.message || e2),
          },
        });
      }
    }
  } catch (err) {
    // Ultimate fallback before 500
    const fromFallback = String(req.query.from || '').toUpperCase().replace('NTD', 'TWD');
    const toFallback = String(req.query.to || '').toUpperCase().replace('NTD', 'TWD');
    const staticKey = `${fromFallback}->${toFallback}`;
    if (STATIC_RATES[staticKey]) {
      return res.json({ from: fromFallback, to: toFallback, rate: STATIC_RATES[staticKey], source: 'emergency-fallback' });
    }
    return res.status(500).json({ error: err?.message || 'fx error' });
  }
});

module.exports = router;