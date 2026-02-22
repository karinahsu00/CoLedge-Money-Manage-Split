const admin = require('../config/firebase');
const db = admin.database();

class Transaction {
  // 创建交易
  static async create(userId, transactionData) {
    const ref = db.ref(`users/${userId}/transactions`).push();
    const id = ref.key;
    await ref.set({
      id,
      date: transactionData.date || new Date().toISOString(),
      amount: transactionData.amount,
      category: transactionData.category, // 'expense', 'income', 'transfer'
      account: transactionData.account, // 账户ID
      members: transactionData.members || [], // 涉及的成员
      description: transactionData.description,
      tags: transactionData.tags || [],
      createdAt: new Date().toISOString(),
      ...transactionData
    });
    return { id, ...transactionData };
  }

  // 获取用户所有交易
  static async getByUserId(userId) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // 按类别获取交易
  static async getByCategory(userId, category) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).filter(t => t.category === category);
  }

  // 按日期范围获取交易
  static async getByDateRange(userId, startDate, endDate) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).filter(t => {
      const tDate = new Date(t.date);
      return tDate >= new Date(startDate) && tDate <= new Date(endDate);
    });
  }

  // 获取单个交易
  static async getById(userId, transactionId) {
    const snapshot = await db.ref(`users/${userId}/transactions/${transactionId}`).once('value');
    if (!snapshot.exists()) return null;
    return snapshot.val();
  }

  // 更新交易
  static async update(userId, transactionId, transactionData) {
    await db.ref(`users/${userId}/transactions/${transactionId}`).update(transactionData);
    return this.getById(userId, transactionId);
  }

  // 删除交易
  static async delete(userId, transactionId) {
    await db.ref(`users/${userId}/transactions/${transactionId}`).remove();
  }
}

module.exports = Transaction;
