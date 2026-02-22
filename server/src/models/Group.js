const admin = require('../config/firebase');
const db = admin.database();

class Group {
  // 创建群组
  static async create(userId, groupData) {
    const ref = db.ref(`users/${userId}/groups`).push();
    const id = ref.key;
    await ref.set({
      id,
      name: groupData.name,
      description: groupData.description || '',
      members: [userId, ...(groupData.members || [])], // 包括创建者
      createdAt: new Date().toISOString(),
      createdBy: userId,
      ...groupData
    });
    return { id, ...groupData };
  }

  // 获取用户所有群组
  static async getByUserId(userId) {
    const snapshot = await db.ref(`users/${userId}/groups`).once('value');
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
  }

  // 获取单个群组
  static async getById(userId, groupId) {
    const snapshot = await db.ref(`users/${userId}/groups/${groupId}`).once('value');
    if (!snapshot.exists()) return null;
    return snapshot.val();
  }

  // 更新群组
  static async update(userId, groupId, groupData) {
    await db.ref(`users/${userId}/groups/${groupId}`).update(groupData);
    return this.getById(userId, groupId);
  }

  // 添加成员到群组
  static async addMember(userId, groupId, memberId) {
    const group = await this.getById(userId, groupId);
    if (!group.members.includes(memberId)) {
      group.members.push(memberId);
      await db.ref(`users/${userId}/groups/${groupId}/members`).set(group.members);
    }
    return group;
  }

  // 删除群组
  static async delete(userId, groupId) {
    await db.ref(`users/${userId}/groups/${groupId}`).remove();
  }
}

module.exports = Group;
