const express = require('express');
const router = express.Router();

// Sample in-memory data structure for ledgers
let ledgers = [];

// CREATE: Add a new ledger
router.post('/', (req, res) => {
    const ledger = req.body;
    ledger.id = ledgers.length + 1;  // Simple ID assignment
    ledgers.push(ledger);
    res.status(201).send(ledger);
});

// READ: Get all ledgers
router.get('/', (req, res) => {
    res.send(ledgers);
});

// READ: Get a ledger by ID
router.get('/:id', (req, res) => {
    const ledger = ledgers.find(l => l.id === parseInt(req.params.id));
    if (!ledger) return res.status(404).send('Ledger not found');
    res.send(ledger);
});

// UPDATE: Update a ledger by ID
router.put('/:id', (req, res) => {
    const ledger = ledgers.find(l => l.id === parseInt(req.params.id));
    if (!ledger) return res.status(404).send('Ledger not found');
    Object.assign(ledger, req.body);
    res.send(ledger);
});

// DELETE: Delete a ledger by ID
router.delete('/:id', (req, res) => {
    const ledgerIndex = ledgers.findIndex(l => l.id === parseInt(req.params.id));
    if (ledgerIndex === -1) return res.status(404).send('Ledger not found');
    ledgers.splice(ledgerIndex, 1);
    res.status(204).send();
});

module.exports = router;