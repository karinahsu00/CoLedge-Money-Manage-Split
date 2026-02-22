const admin = require('../config/firebase');
const db = admin.database();

class Account {
  // 创建账户
  static async create(userId, accountData) {
    const ref = db.ref(`users/${userId}/accounts`).push();
    const id = ref.key;
    await ref.set({
      id,
      name: accountData.name, // 现金、信用卡、银行账户
      type: accountData.type, // 'cash', 'credit_card', 'bank_account'
      balance: accountData.balance || 0,
      currency: accountData.currency || 'USD',
      createdAt: new Date().toISOString(),
      ...accountData
    });
    return { id, ...accountData };
  }

  // 获取用户所有账户
  static async getByUserId(userId) {
    const snapshot = await db.ref(`users/${userId}/accounts`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
  }

  // 获取单个账户
  static async getById(userId, accountId) {
    const snapshot = await db.ref(`users/${userId}/accounts/${accountId}`).once('value');
    if (!snapshot.exists()) return null;
    return snapshot.val();
  }

  // 更新账户
  static async update(userId, accountId, accountData) {
    await db.ref(`users/${userId}/accounts/${accountId}`).update(accountData);
    return this.getById(userId, accountId);
  }

  // 删除账户
  static async delete(userId, accountId) {
    await db.ref(`users/${userId}/accounts/${accountId}`).remove();
  }

  // 更新账户余额
  static async updateBalance(userId, accountId, amount) {
    const account = await this.getById(userId, accountId);
    const newBalance = (account.balance || 0) + amount;
    await db.ref(`users/${userId}/accounts/${accountId}/balance`).set(newBalance);
    return newBalance;
  }
}

module.exports = Account;
