const admin = require('../config/firebase');
const db = admin.database();
const Split = require('./Split');

class Ledger {
  // 获取群组的账簿（所有交易记录）
  static async getByGroupId(userId, groupId) {
    const splitsSnapshot = await db.ref(`users/${userId}/groups/${groupId}/splits`).once('value');
    const splits = splitsSnapshot.exists() ? Object.values(splitsSnapshot.val()) : [];
    
    return {
      groupId,
      splits,
      summary: this.calculateSummary(splits)
    };
  }

  // 获取用户的所有账簿
  static async getByUserId(userId) {
    const groupsSnapshot = await db.ref(`users/${userId}/groups`).once('value');
    if (!groupsSnapshot.exists()) return [];
    
    const groups = Object.values(groupsSnapshot.val());
    const ledgers = [];

    for (const group of groups) {
      const ledger = await this.getByGroupId(userId, group.id);
      ledgers.push(ledger);
    }

    return ledgers;
  }

  // 计算账簿摘要
  static calculateSummary(splits) {
    const summary = {
      totalTransactions: splits.length,
      totalAmount: 0,
      byMember: {}
    };

    splits.forEach(split => {
      summary.totalAmount += split.totalAmount;
      
      if (!summary.byMember[split.paidBy]) {
        summary.byMember[split.paidBy] = { paid: 0, owed: 0 };
      }
      summary.byMember[split.paidBy].paid += split.totalAmount;

      split.splitWith?.forEach(member => {
        if (!summary.byMember[member]) {
          summary.byMember[member] = { paid: 0, owed: 0 };
        }
        summary.byMember[member].owed += split.splitAmounts?.[member] || 0;
      });
    });

    return summary;
  }
}

module.exports = Ledger;
