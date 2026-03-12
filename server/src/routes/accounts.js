const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const admin = require('../config/firebase');

const db = admin.database();

// 获取用户所有账户
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid; // 从 Auth middleware 获取
    const accounts = await Account.getByUserId(userId);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建新账户
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const account = await Account.create(userId, req.body);
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个账户
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const account = await Account.getById(userId, req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新账户
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const account = await Account.update(userId, req.params.id, req.body);
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除账户（✅ 若有交易引用，禁止删除）
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const accountId = req.params.id;

    // 先确认账户存在
    const account = await Account.getById(userId, accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // 检查是否有交易引用该账户
    const snap = await db.ref(`users/${userId}/transactions`).once('value');
    if (snap.exists()) {
      const txs = Object.values(snap.val());
      const inUse = txs.some(
        (t) => t && (t.accountId === accountId || t.accountToId === accountId)
      );

      if (inUse) {
        return res.status(409).json({
          error:
            'Cannot delete account because it is used by existing transactions. Consider archiving this account instead.',
        });
      }
    }

    await Account.delete(userId, accountId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;