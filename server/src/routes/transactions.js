const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// 获取用户所有交易
router.get('/', async (req, res) => {
  try {
    const userId = req.user.uid;
    const transactions = await Transaction.getByUserId(userId);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建新交易
router.post('/', async (req, res) => {
  try {
    const userId = req.user.uid;

    const body = {
      ...req.body,
      amount: Number(req.body.amount),
    };

    if (!body.accountId) {
      return res.status(400).json({ error: 'accountId is required' });
    }
    if (body.type === 'transfer' && !body.accountToId) {
      return res.status(400).json({ error: 'accountToId is required for transfer' });
    }

    const transaction = await Transaction.create(userId, body);

    // 更新账户余额（用 accountId）
    if (body.type === 'expense') {
      await Account.updateBalance(userId, body.accountId, -body.amount);
    } else if (body.type === 'income') {
      await Account.updateBalance(userId, body.accountId, body.amount);
    } else if (body.type === 'transfer') {
      await Account.updateBalance(userId, body.accountId, -body.amount);
      await Account.updateBalance(userId, body.accountToId, body.amount);
    }

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 按类别获取交易
router.get('/category/:category', async (req, res) => {
  try {
    const userId = req.user.uid;
    const transactions = await Transaction.getByCategory(userId, req.params.category);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 按日期范围获取交易
router.get('/date-range', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;
    const transactions = await Transaction.getByDateRange(userId, startDate, endDate);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个交易
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const transaction = await Transaction.getById(userId, req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新交易（含帳戶餘額調整）
// NOTE: Firebase Realtime Database does not support multi-path atomic transactions in the same way
// as SQL. The balance reversal + update + re-application below is best-effort and not atomic.
// Concurrent edits on the same transaction may cause balance drift. For production use, consider
// using Firebase Firestore with transactions, or a server-side queue.
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;

    // 1. Load old transaction so we can reverse its balance effect
    const oldTx = await Transaction.getById(userId, req.params.id);
    if (!oldTx) return res.status(404).json({ error: 'Transaction not found' });

    // 2. Reverse old balance effects
    const oldAmount = Number(oldTx.amount || 0);
    if (oldTx.type === 'expense' && oldTx.accountId) {
      await Account.updateBalance(userId, oldTx.accountId, +oldAmount);
    } else if (oldTx.type === 'income' && oldTx.accountId) {
      await Account.updateBalance(userId, oldTx.accountId, -oldAmount);
    } else if (oldTx.type === 'transfer') {
      if (oldTx.accountId) await Account.updateBalance(userId, oldTx.accountId, +oldAmount);
      if (oldTx.accountToId) await Account.updateBalance(userId, oldTx.accountToId, -oldAmount);
    }

    // 3. Update the transaction record
    const body = { ...req.body };
    if (body.amount !== undefined) body.amount = Number(body.amount);
    const transaction = await Transaction.update(userId, req.params.id, body);

    // 4. Apply new balance effects using merged values (new overrides old)
    const newType = body.type !== undefined ? body.type : oldTx.type;
    const newAmount = body.amount !== undefined ? Number(body.amount) : oldAmount;
    const newAccountId = body.accountId !== undefined ? body.accountId : oldTx.accountId;
    const newAccountToId = body.accountToId !== undefined ? body.accountToId : oldTx.accountToId;

    if (newType === 'expense' && newAccountId) {
      await Account.updateBalance(userId, newAccountId, -newAmount);
    } else if (newType === 'income' && newAccountId) {
      await Account.updateBalance(userId, newAccountId, +newAmount);
    } else if (newType === 'transfer') {
      if (newAccountId) await Account.updateBalance(userId, newAccountId, -newAmount);
      if (newAccountToId) await Account.updateBalance(userId, newAccountToId, +newAmount);
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除交易
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    await Transaction.delete(userId, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;