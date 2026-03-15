require('dotenv').config();
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

// Build CORS allowlist from environment variables.
// Accepts a comma-separated list via CORS_ORIGINS or a single origin via CORS_ORIGIN.
// In development (NODE_ENV !== 'production') http://localhost:3000 is always allowed.
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
    // Allow requests with no Origin header (same-origin, curl, server-to-server)
    if (!origin) return callback(null, true);
    // If no allowlist is configured, keep the open behaviour so local dev works out of the box
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(
      new Error(
        `CORS blocked for origin: ${origin}. ` +
          'Set CORS_ORIGIN or CORS_ORIGINS env var to allow this origin.'
      )
    );
  },
};

app.use(cors(corsOptions));
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