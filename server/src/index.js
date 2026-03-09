const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const groupsRoutes = require('./routes/groups');
const splitsRoutes = require('./routes/splits');
const ledgersRoutes = require('./routes/ledgers');

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, res, next) => {
  console.log('[REQ]', req.method, req.url);
  next();
});

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

app.get('/api/me', apiLimiter, authMiddleware, (req, res) => {
  const u = req.user || {};
  res.json({
    uid: u.uid || u.user_id || u.sub || null,
    email: u.email || null,
  });
});

// Protected routes
app.use('/api/accounts', authMiddleware, accountsRoutes);
app.use('/api/transactions', authMiddleware, transactionsRoutes);
app.use('/api/groups', authMiddleware, groupsRoutes);
app.use('/api/splits', authMiddleware, splitsRoutes);
app.use('/api/ledgers', authMiddleware, ledgersRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to CoLedge API!');
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});