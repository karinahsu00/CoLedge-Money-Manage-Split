const admin = require('../config/firebase');
const db = admin.database();

const TRANSACTION_TYPES = ['expense', 'income', 'transfer'];

// Normalize a transaction: for legacy data where `category` held the transaction
// type (expense/income/transfer), map it to `type` and clear `category`.
function normalize(transaction) {
  if (!transaction) return transaction;
  const t = { ...transaction };
  if (!t.type && TRANSACTION_TYPES.includes(t.category)) {
    t.type = t.category;
    t.category = undefined;
  }
  if (t.members === undefined) t.members = [];
  return t;
}

// Derive the transaction type from input data
function deriveType(data) {
  return data.type || (TRANSACTION_TYPES.includes(data.category) ? data.category : undefined);
}

// Derive the expense sub-category from input data
function deriveCategory(data) {
  return data.category && !TRANSACTION_TYPES.includes(data.category) ? data.category : undefined;
}

class Transaction {
  // Create a transaction
  static async create(userId, transactionData) {
    const ref = db.ref(`users/${userId}/transactions`).push();
    const id = ref.key;

    const type = deriveType(transactionData);
    const category = deriveCategory(transactionData);

    const record = {
      id,
      date: transactionData.date || new Date().toISOString(),
      amount: transactionData.amount,
      type,
      category,
      account: transactionData.account,
      members: transactionData.members || [],
      description: transactionData.description,
      tags: transactionData.tags || [],
      note: transactionData.note,
      createdAt: new Date().toISOString(),
    };

    await ref.set(record);
    return record;
  }

  // Get all transactions for a user
  static async getByUserId(userId) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val())
      .map(normalize)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Get transactions by type (expense/income/transfer)
  static async getByCategory(userId, category) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val())
      .map(normalize)
      .filter(t => t.type === category || t.category === category);
  }

  // Get transactions within a date range
  static async getByDateRange(userId, startDate, endDate) {
    const snapshot = await db.ref(`users/${userId}/transactions`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val())
      .map(normalize)
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate >= new Date(startDate) && tDate <= new Date(endDate);
      });
  }

  // Get a single transaction
  static async getById(userId, transactionId) {
    const snapshot = await db.ref(`users/${userId}/transactions/${transactionId}`).once('value');
    if (!snapshot.exists()) return null;
    return normalize(snapshot.val());
  }

  // Update a transaction
  static async update(userId, transactionId, transactionData) {
    const type = deriveType(transactionData);
    const category = deriveCategory(transactionData);

    const updates = { ...transactionData };
    if (type !== undefined) updates.type = type;
    if (category !== undefined) updates.category = category;

    await db.ref(`users/${userId}/transactions/${transactionId}`).update(updates);
    return this.getById(userId, transactionId);
  }

  // Delete a transaction
  static async delete(userId, transactionId) {
    await db.ref(`users/${userId}/transactions/${transactionId}`).remove();
  }
}

module.exports = Transaction;
