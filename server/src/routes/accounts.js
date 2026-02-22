const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const admin = require('../config/firebase');

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

// 删除账户
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        await Account.delete(userId, req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
