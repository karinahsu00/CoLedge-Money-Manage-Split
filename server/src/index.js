require('dotenv').config();
const express = require('express'); // 補上這個
const cors = require('cors');       // 補上這個

// 請確保這些路徑與你的檔案結構一致，如果沒有這些檔案會報錯
const authRoutes = require('./routes/auth'); 
const accountsRoutes = require('./routes/accounts');
const transactionsRoutes = require('./routes/transactions');
const groupsRoutes = require('./routes/groups');
const splitsRoutes = require('./routes/splits');
const ledgersRoutes = require('./routes/ledgers');
const fxRoutes = require('./routes/fx');
const { authMiddleware } = require('./middleware/auth'); // 假設你在這
const { apiLimiter } = require('./middleware/limiter');   // 假設你在這

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
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
};

// --- Middleware ---
app.use(cors(corsOptions));
app.use(express.json());

// --- Routes ---
app.get('/', (req, res) => {
  res.send('Welcome to CoLedge API!');
});

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