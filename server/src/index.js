require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 1. 確保這裡只引入存在的檔案
const authRoutes = require('./routes/auth'); 
const accountsRoutes = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const groupsRoutes = require('./routes/groups');
const splitsRoutes = require('./routes/splits');
const ledgersRoutes = require('./routes/ledgers');
const fxRoutes = require('./routes/fx');

// 這裡保留 auth.js，因為截圖顯示它存在
const authMiddleware = require('./middleware/auth');

const app = express();

// --- CORS 設定 ---
const parseOrigins = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...parseOrigins(process.env.CORS_ORIGINS),
  ...(process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN.trim()] : []),
];

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000');
}

const corsOptions = {
  origin: '*',
  credentials: true
};

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());

// --- Routes ---
app.get('/', (req, res) => {
  res.send('Welcome to CoLedge API!');
});

app.use('/api/auth', authRoutes);

// 2. 這裡原本有 apiLimiter，我幫你拿掉了
app.get('/api/me', authMiddleware, (req, res) => {
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
app.use('/api/fx', authMiddleware, fxRoutes);

// Error Handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});