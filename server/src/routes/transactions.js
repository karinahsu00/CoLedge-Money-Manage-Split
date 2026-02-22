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
        const transaction = await Transaction.create(userId, req.body);
        
        // 更新账户余额
        if (req.body.category === 'expense') {
            await Account.updateBalance(userId, req.body.account, -req.body.amount);
        } else if (req.body.category === 'income') {
            await Account.updateBalance(userId, req.body.account, req.body.amount);
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

// 更新交易
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const transaction = await Transaction.update(userId, req.params.id, req.body);
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
