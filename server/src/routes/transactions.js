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
        
        // 更新账户余额（根据 type 字段区分类型，按账户名查找）
        if (req.body.type === 'expense') {
            await Account.updateBalanceByName(userId, req.body.account, -parseFloat(req.body.amount));
        } else if (req.body.type === 'income') {
            await Account.updateBalanceByName(userId, req.body.account, parseFloat(req.body.amount));
        } else if (req.body.type === 'transfer') {
            await Account.updateBalanceByName(userId, req.body.account, -parseFloat(req.body.amount));
            if (req.body.accountTo) {
                await Account.updateBalanceByName(userId, req.body.accountTo, parseFloat(req.body.amount));
            }
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

// 更新交易（同时回滚旧余额、应用新余额）
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const oldTx = await Transaction.getById(userId, req.params.id);
        
        if (!oldTx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // 回滚旧交易对账户余额的影响
        if (oldTx.type === 'expense') {
            await Account.updateBalanceByName(userId, oldTx.account, parseFloat(oldTx.amount));
        } else if (oldTx.type === 'income') {
            await Account.updateBalanceByName(userId, oldTx.account, -parseFloat(oldTx.amount));
        } else if (oldTx.type === 'transfer') {
            await Account.updateBalanceByName(userId, oldTx.account, parseFloat(oldTx.amount));
            if (oldTx.accountTo) {
                await Account.updateBalanceByName(userId, oldTx.accountTo, -parseFloat(oldTx.amount));
            }
        }

        const transaction = await Transaction.update(userId, req.params.id, req.body);

        // 应用新交易对账户余额的影响
        const newType = req.body.type || oldTx.type;
        const newAccount = req.body.account || oldTx.account;
        const newAmount = parseFloat(req.body.amount != null ? req.body.amount : oldTx.amount);
        const newAccountTo = req.body.accountTo !== undefined ? req.body.accountTo : oldTx.accountTo;

        if (newType === 'expense') {
            await Account.updateBalanceByName(userId, newAccount, -newAmount);
        } else if (newType === 'income') {
            await Account.updateBalanceByName(userId, newAccount, newAmount);
        } else if (newType === 'transfer') {
            await Account.updateBalanceByName(userId, newAccount, -newAmount);
            if (newAccountTo) {
                await Account.updateBalanceByName(userId, newAccountTo, newAmount);
            }
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
