require('dotenv').config();

const app = express();

// CORS allowlist (production-friendly)
const parseOrigins = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const corsOrigins =
  parseOrigins(process.env.CORS_ORIGINS) ||
  (process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : []);

<<<<<<< HEAD
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
=======
const isDev = process.env.NODE_ENV !== 'production';

// Always allow localhost for dev
if (isDev) {
  corsOrigins.push('http://localhost:3000');
>>>>>>> 49b59f9 (Fix mobile UI and accounts rendering)
}

const corsOptions = {
  origin: (origin, callback) => {
<<<<<<< HEAD
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
=======
    // Allow same-origin / server-to-server / curl (no Origin header)
    if (!origin) return callback(null, true);

    // If no env configured, keep current behavior (allow all) to avoid breaking
    if (corsOrigins.length === 0) return callback(null, true);

    if (corsOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  }
>>>>>>> 49b59f9 (Fix mobile UI and accounts rendering)
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

// FX proxy (Protected)
app.use('/api/fx', authMiddleware, fxRoutes);

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