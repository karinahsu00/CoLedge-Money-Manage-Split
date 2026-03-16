const admin    = require('../config/firebase');
const { getRate } = require('../utils/fxHelper');  // FX rate lookup
const db       = admin.database();

class Account {
  static clean(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  }

  static async create(userId, accountData) {
    const ref = db.ref(`users/${userId}/accounts`).push();
    const id  = ref.key;

    const startingBalance = Number(accountData.balance || 0);
    const currency        = accountData.currency || 'USD';

    // Auto-resolve fxRateToUSD: how many USD = 1 unit of this currency
    // e.g. NTD → ~0.031,  JPY → ~0.0067,  USD → 1
    let fxRateToUSD = Number(accountData.fxRateToUSD) || null;
    if (!fxRateToUSD || !Number.isFinite(fxRateToUSD)) {
      try {
        fxRateToUSD = await getRate(currency, 'USD');
      } catch (e) {
        console.warn(`[Account.create] FX lookup failed for ${currency}, defaulting to 1:`, e.message);
        fxRateToUSD = 1;
      }
    }

    const payload = this.clean({
      id,
      name:           accountData.name,
      type:           accountData.type,
      balance:        startingBalance,
      initialBalance: accountData.initialBalance !== undefined ? Number(accountData.initialBalance) : startingBalance,
      currency,
      fxRateToUSD,    // ← always present after this point
      archived:       Boolean(accountData.archived || false),
      createdAt:      new Date().toISOString(),
      ...accountData,

      // enforce — these override anything spread from accountData
      id,
      balance:        startingBalance,
      initialBalance: accountData.initialBalance !== undefined ? Number(accountData.initialBalance) : startingBalance,
      currency,
      fxRateToUSD,
      archived:       Boolean(accountData.archived || false),
    });

    await ref.set(payload);
    return payload;
  }

  static async getByUserId(userId) {
    const snapshot = await db.ref(`users/${userId}/accounts`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
  }

  static async getById(userId, accountId) {
    const snapshot = await db.ref(`users/${userId}/accounts/${accountId}`).once('value');
    if (!snapshot.exists()) return null;
    return snapshot.val();
  }

  static async update(userId, accountId, accountData) {
    const payload = this.clean(accountData);

    // normalize if present
    if (payload.balance        !== undefined) payload.balance        = Number(payload.balance);
    if (payload.initialBalance !== undefined) payload.initialBalance = Number(payload.initialBalance);
    if (payload.archived       !== undefined) payload.archived       = Boolean(payload.archived);

    // If currency is being changed (or fxRateToUSD not set), refresh the rate
    if (payload.currency && !payload.fxRateToUSD) {
      try {
        payload.fxRateToUSD = await getRate(payload.currency, 'USD');
      } catch (e) {
        console.warn(`[Account.update] FX lookup failed for ${payload.currency}:`, e.message);
        payload.fxRateToUSD = payload.currency === 'USD' ? 1 : undefined;
      }
    }
    if (payload.fxRateToUSD !== undefined) payload.fxRateToUSD = Number(payload.fxRateToUSD);

    await db.ref(`users/${userId}/accounts/${accountId}`).update(payload);
    return this.getById(userId, accountId);
  }

  static async delete(userId, accountId) {
    await db.ref(`users/${userId}/accounts/${accountId}`).remove();
  }

  static async updateBalance(userId, accountId, amount) {
    const account = await this.getById(userId, accountId);
    if (!account) throw new Error(`Account not found: ${accountId}`);

    const delta = Number(amount || 0);
    const current = Number(account.balance || 0);
    const newBalance = current + delta;

    await db.ref(`users/${userId}/accounts/${accountId}/balance`).set(newBalance);
    return newBalance;
  }
}

module.exports = Account;