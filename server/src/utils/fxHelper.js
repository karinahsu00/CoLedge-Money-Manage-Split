/**
 * fxHelper.js  —  server/src/utils/fxHelper.js
 *
 * Shared FX rate logic used by:
 *   - routes/fx.js      (HTTP endpoint)
 *   - models/Account.js (auto-populate fxRateToUSD on create/update)
 *
 * getRate(from, to) → Promise<number>
 *   Returns how many units of `to` equal 1 unit of `from`.
 *   e.g. getRate('NTD', 'USD') → ~0.031
 *        getRate('JPY', 'USD') → ~0.0067
 *
 * Fallback chain:  cache → open.er-api.com → frankfurter → static table → failsafe
 */

'use strict';

// ─── In-memory cache ──────────────────────────────────────────────────────────
const cache   = new Map();
const TTL_MS  = 60 * 60 * 1000; // 1 hour

const getCached = (from, to) => {
  const hit = cache.get(`${from}->${to}`);
  if (!hit || hit.expiresAt <= Date.now()) return null;
  return hit.rate;
};

const setCached = (from, to, rate) => {
  cache.set(`${from}->${to}`, { rate, expiresAt: Date.now() + TTL_MS });
};

// ─── Static fallback table ────────────────────────────────────────────────────
const STATIC_RATES = {
  'USD->TWD': 32.2,         'TWD->USD': 1 / 32.2,
  'USD->NTD': 32.2,         'NTD->USD': 1 / 32.2,
  'EUR->TWD': 35.0,         'TWD->EUR': 1 / 35.0,
  'JPY->TWD': 0.21,         'TWD->JPY': 1 / 0.21,
  'JPY->USD': 1 / 149.5,   'USD->JPY': 149.5,
  'EUR->USD': 1.08,         'USD->EUR': 1 / 1.08,
  'GBP->USD': 1.27,         'USD->GBP': 1 / 1.27,
  'CNY->USD': 1 / 7.24,    'USD->CNY': 7.24,
  'HKD->USD': 1 / 7.82,    'USD->HKD': 7.82,
  'KRW->USD': 1 / 1330,    'USD->KRW': 1330,
  'SGD->USD': 1 / 1.34,    'USD->SGD': 1.34,
};

// ─── Providers ────────────────────────────────────────────────────────────────
const fetchErApi = async (from, to) => {
  const resp = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  if (!resp.ok) throw new Error(`er-api ${resp.status}`);
  const json = await resp.json();
  const rate = json?.rates?.[to];
  if (!rate || Number.isNaN(Number(rate))) throw new Error(`er-api missing rate for ${to}`);
  return Number(rate);
};

const fetchFrankfurter = async (from, to) => {
  const resp = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  if (!resp.ok) throw new Error(`frankfurter ${resp.status}`);
  const json = await resp.json();
  const rate = json?.rates?.[to];
  if (!rate || Number.isNaN(Number(rate))) throw new Error('frankfurter missing rate');
  return Number(rate);
};

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * getRate(from, to)
 * @param {string} from  - source currency code (e.g. 'NTD', 'JPY', 'USD')
 * @param {string} to    - target currency code (default: 'USD')
 * @returns {Promise<number>} exchange rate
 */
const getRate = async (from, to = 'USD') => {
  // Normalise: NTD ↔ TWD are the same currency
  from = String(from).toUpperCase().replace('NTD', 'TWD');
  to   = String(to).toUpperCase().replace('NTD', 'TWD');

  if (from === to) return 1;

  // 1. Cache hit
  const cached = getCached(from, to);
  if (cached != null) return cached;

  // 2. Provider: er-api
  try {
    const rate = await fetchErApi(from, to);
    setCached(from, to, rate);
    return rate;
  } catch (e1) {
    // 3. Provider: frankfurter
    try {
      const rate = await fetchFrankfurter(from, to);
      setCached(from, to, rate);
      return rate;
    } catch (e2) {
      // 4. Static table
      const staticRate = STATIC_RATES[`${from}->${to}`];
      if (staticRate != null) return staticRate;

      // 5. Last-resort failsafe for common pairs
      if (from === 'TWD' && to === 'USD') return 1 / 32.2;
      if (from === 'USD' && to === 'TWD') return 32.2;

      throw new Error(
        `Cannot get rate ${from}->${to}. er-api: ${e1.message} | frankfurter: ${e2.message}`
      );
    }
  }
};

module.exports = { getRate };
