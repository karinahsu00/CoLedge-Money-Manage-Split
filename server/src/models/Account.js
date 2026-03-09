const admin = require('../config/firebase');
const db = admin.database();

class Account {
  static clean(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  }

  static async create(userId, accountData) {
    const ref = db.ref(`users/${userId}/accounts`).push();
    const id = ref.key;

    const startingBalance = Number(accountData.balance || 0);

    const payload = this.clean({
      id,
      name: accountData.name,
      type: accountData.type,
      balance: startingBalance,
      initialBalance: accountData.initialBalance !== undefined ? Number(accountData.initialBalance) : startingBalance,
      currency: accountData.currency || 'USD',
      archived: Boolean(accountData.archived || false),
      createdAt: new Date().toISOString(),
      ...accountData,

      // enforce types/fields
      id,
      balance: startingBalance,
      initialBalance: accountData.initialBalance !== undefined ? Number(accountData.initialBalance) : startingBalance,
      currency: accountData.currency || 'USD',
      archived: Boolean(accountData.archived || false),
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
    if (payload.balance !== undefined) payload.balance = Number(payload.balance);
    if (payload.initialBalance !== undefined) payload.initialBalance = Number(payload.initialBalance);
    if (payload.archived !== undefined) payload.archived = Boolean(payload.archived);

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