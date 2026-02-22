const express = require('express');
const router = express.Router();
const Split = require('../models/Split');

// 创建分账记录
router.post('/', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { groupId } = req.body;
        const split = await Split.create(userId, groupId, req.body);
        res.status(201).json(split);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取群组的所有分账记录
router.get('/group/:groupId', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { groupId } = req.params;
        const splits = await Split.getByGroupId(userId, groupId);
        res.json(splits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取单个分账记录
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const split = await Split.getByIdDirect(userId, id);
        if (!split) return res.status(404).json({ error: 'Split not found' });
        res.json(split);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 更新分账记录
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        const split = await Split.updateDirect(userId, id, req.body);
        res.json(split);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除分账记录
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { id } = req.params;
        await Split.deleteDirect(userId, id);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 计算分账余额
router.get('/group/:groupId/balance', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { groupId } = req.params;
        const balance = await Split.calculateBalance(userId, groupId);
        res.json({ balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
