const express = require('express');
const router = express.Router();

// Endpoint to split an expense
router.post('/split-expense', (req, res) => {
    const { totalAmount, numberOfPeople } = req.body;

    if (!totalAmount || !numberOfPeople) {
        return res.status(400).json({ error: 'Please provide totalAmount and numberOfPeople.' });
    }

    const splitAmount = totalAmount / numberOfPeople;
    res.status(200).json({ splitAmount });
});

// Endpoint to get the total amount and number of people
router.get('/get-details', (req, res) => {
    // Logic to retrieve expense details would go here
    res.status(200).json({ message: 'This would return the expense details.' });
});

module.exports = router;