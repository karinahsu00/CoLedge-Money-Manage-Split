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
    const from = String(req.query.from || '').toUpperCase();
    const to = String(req.query.to || '').toUpperCase();

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
        // Both failed: return 502 with both errors
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
    return res.status(500).json({ error: err?.message || 'fx error' });
  }
});

module.exports = router;