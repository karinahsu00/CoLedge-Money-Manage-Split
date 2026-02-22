const express = require('express');
const router = express.Router();
const Ledger = require('../models/Ledger');

// 获取群组的账簿
router.get('/group/:groupId', async (req, res) => {
    try {
        const userId = req.user.uid;
        const { groupId } = req.params;
        const ledger = await Ledger.getByGroupId(userId, groupId);
        res.json(ledger);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 获取用户的所有账簿
router.get('/', async (req, res) => {
    try {
        const userId = req.user.uid;
        const ledgers = await Ledger.getByUserId(userId);
        res.json(ledgers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
