const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const groupsRoutes = require('./routes/groups');
const splitsRoutes = require('./routes/splits');
const ledgersRoutes = require('./routes/ledgers');

const app = express();

// Enable CORS
app.use(cors());

// Middleware
app.use(express.json());

// Public routes (不需要认证)
app.use('/api/auth', authRoutes);

// Protected routes (需要认证)
app.use('/api/accounts', authMiddleware, accountsRoutes);
app.use('/api/transactions', authMiddleware, transactionsRoutes);
app.use('/api/groups', authMiddleware, groupsRoutes);
app.use('/api/splits', authMiddleware, splitsRoutes);
app.use('/api/ledgers', authMiddleware, ledgersRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Welcome to CoLedge API!');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
