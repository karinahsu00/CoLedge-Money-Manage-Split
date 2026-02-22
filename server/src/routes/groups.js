const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const Split = require('../models/Split');

// 获取用户所有群组
router.get('/', async (req, res) => {
    try {
        const userId = req.user.uid;
        const groups = await Group.getByUserId(userId);
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 创建新群组
router.post('/', async (req, res) => {
    try {
        const userId = req.user.uid;
        const group = await Group.create(userId, req.body);
        res.status(201).json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取单个群组
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const group = await Group.getById(userId, req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 更新群组
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const group = await Group.update(userId, req.params.id, req.body);
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 添加成员到群组
router.post('/:id/members', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { memberId } = req.body;
        const group = await Group.addMember(userId, req.params.id, memberId);
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除群组
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        await Group.delete(userId, req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取群组的分账余额
router.get('/:id/balance', async (req, res) => {
    try {
        const userId = req.user.uid;
        const balance = await Split.calculateBalance(userId, req.params.id);
        res.json({ balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
