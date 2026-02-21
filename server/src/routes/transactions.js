const express = require('express');
const router = express.Router();
const transactions = [];

// Endpoint to get all transactions
router.get('/', (req, res) => {
    res.json(transactions);
});

// Endpoint to create a new transaction
router.post('/', (req, res) => {
    const { amount, description } = req.body;
    const transaction = { id: transactions.length + 1, amount, description, date: new Date() };
    transactions.push(transaction);
    res.status(201).json(transaction);
});

// Endpoint to get a transaction by id
router.get('/:id', (req, res) => {
    const transaction = transactions.find(t => t.id === parseInt(req.params.id));
    if (!transaction) return res.status(404).send('Transaction not found.');
    res.json(transaction);
});

// Endpoint to update a transaction by id
router.put('/:id', (req, res) => {
    const transaction = transactions.find(t => t.id === parseInt(req.params.id));
    if (!transaction) return res.status(404).send('Transaction not found.');
    const { amount, description } = req.body;
    transaction.amount = amount;
    transaction.description = description;
    res.json(transaction);
});

// Endpoint to delete a transaction by id
router.delete('/:id', (req, res) => {
    const transactionIndex = transactions.findIndex(t => t.id === parseInt(req.params.id));
    if (transactionIndex === -1) return res.status(404).send('Transaction not found.');
    transactions.splice(transactionIndex, 1);
    res.status(204).send();
});

module.exports = router;