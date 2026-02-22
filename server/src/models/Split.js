const admin = require('../config/firebase');
const db = admin.database();

class Split {
  // 创建分账记录
  static async create(userId, groupId, splitData) {
    const ref = db.ref(`users/${userId}/groups/${groupId}/splits`).push();
    const id = ref.key;
    await ref.set({
      id,
      groupId,
      totalAmount: splitData.totalAmount,
      paidBy: splitData.paidBy,
      splitWith: splitData.splitWith,
      splitAmounts: splitData.splitAmounts,
      description: splitData.description || '',
      date: splitData.date || new Date().toISOString(),
      settled: splitData.settled || false,
      createdAt: new Date().toISOString(),
      ...splitData
    });
    return { id, ...splitData };
  }

  // 获取群组的所有分账记录
  static async getByGroupId(userId, groupId) {
    const snapshot = await db.ref(`users/${userId}/groups/${groupId}/splits`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // 获取单个分账记录（直接查询）
  static async getByIdDirect(userId, splitId) {
    const groupsSnapshot = await db.ref(`users/${userId}/groups`).once('value');
    if (!groupsSnapshot.exists()) return null;

    const groups = Object.values(groupsSnapshot.val());
    for (const group of groups) {
      const snapshot = await db.ref(`users/${userId}/groups/${group.id}/splits/${splitId}`).once('value');
      if (snapshot.exists()) return snapshot.val();
    }
    return null;
  }

  // 更新分账记录
  static async update(userId, groupId, splitId, splitData) {
    await db.ref(`users/${userId}/groups/${groupId}/splits/${splitId}`).update(splitData);
    return this.getByIdDirect(userId, splitId);
  }

  // 更新分账记录（直接查询）
  static async updateDirect(userId, splitId, splitData) {
    const groupsSnapshot = await db.ref(`users/${userId}/groups`).once('value');
    if (!groupsSnapshot.exists()) throw new Error('No groups found');

    const groups = Object.values(groupsSnapshot.val());
    for (const group of groups) {
      const snapshot = await db.ref(`users/${userId}/groups/${group.id}/splits/${splitId}`).once('value');
      if (snapshot.exists()) {
        await db.ref(`users/${userId}/groups/${group.id}/splits/${splitId}`).update(splitData);
        return this.getByIdDirect(userId, splitId);
      }
    }
    throw new Error('Split not found');
  }

  // 删除分账记录
  static async delete(userId, groupId, splitId) {
    await db.ref(`users/${userId}/groups/${groupId}/splits/${splitId}`).remove();
  }

  // 删除分账记录（直接查询）
  static async deleteDirect(userId, splitId) {
    const groupsSnapshot = await db.ref(`users/${userId}/groups`).once('value');
    if (!groupsSnapshot.exists()) throw new Error('No groups found');

    const groups = Object.values(groupsSnapshot.val());
    for (const group of groups) {
      const snapshot = await db.ref(`users/${userId}/groups/${group.id}/splits/${splitId}`).once('value');
      if (snapshot.exists()) {
        await db.ref(`users/${userId}/groups/${group.id}/splits/${splitId}`).remove();
        return;
      }
    }
    throw new Error('Split not found');
  }

  // 计算用户在群组中的债务/债权
  static async calculateBalance(userId, groupId) {
    const splits = await this.getByGroupId(userId, groupId);
    let balance = 0;

    splits.forEach(split => {
      if (split.paidBy === userId) {
        balance += split.totalAmount;
      }
      
      if (split.splitWith.includes(userId)) {
        balance -= split.splitAmounts?.[userId] || 0;
      }
    });

    return balance;
  }
}

module.exports = Split;
