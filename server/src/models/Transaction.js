const admin = require('../config/firebase');
const db = admin.database();

class Transaction {
  static clean(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  }

  // 创建交易
  static async create(userId, transactionData) {
    const ref = db.ref(`users/${userId}/transactions`).push();
    const id = ref.key;

    // Realtime Database 不允许 undefined
    const description = transactionData.description ?? transactionData.note ?? '';

    const createdAt = transactionData.createdAt || new Date().toISOString();

    const dataToSave = this.clean({
      // core fields
      id,
      date: transactionData.date,
      amount: Number(transactionData.amount),
      type: transactionData.type, // expense | income | transfer
      category: transactionData.category,

      // ids
      accountId: transactionData.accountId,
      accountToId: transactionData.accountToId || '',

      member: transactionData.member || 'You',

      // compatibility fields
      description,
      note: transactionData.note ?? description,

      createdAt,

      // keep any additional fields, but clean() will remove undefined
      ...transactionData,

      // enforce key fields at end
      id,
      amount: Number(transactionData.amount),
      accountId: transactionData.accountId,
      accountToId: transactionData.accountToId || '',
      description,
      createdAt,
    });

    await ref.set(dataToSave);
    return dataToSave;
  }

  // 获取用户所有交易
  static async getByUserId(userId) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
  }

  // 按类别获取交易
  static async getByCategory(userId, category) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).filter((t) => t.category === category);
  }

  // 按日期范围获取交易
  static async getByDateRange(userId, startDate, endDate) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Object.values(snapshot.val()).filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
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
    const description = transactionData.description ?? transactionData.note;
    const payload = this.clean({
      ...transactionData,
      ...(description !== undefined ? { description } : {}),
    });

    await db.ref(`users/${userId}/transactions/${transactionId}`).update(payload);
    return this.getById(userId, transactionId);
  }

  // 删除交易
  static async delete(userId, transactionId) {
    await db.ref(`users/${userId}/transactions/${transactionId}`).remove();
  }
}

module.exports = Transaction;