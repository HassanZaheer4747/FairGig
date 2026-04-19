require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter, authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service', port: PORT, timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const connectWithRetry = async () => {
  const opts = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    family: 4,
  };
  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, opts);
      console.log('✅ MongoDB connected (auth-service)');
      return;
    } catch (err) {
      console.error(`❌ MongoDB attempt ${attempt} failed: ${err.message}`);
      if (attempt >= 5) {
        console.error('❌ Giving up after 5 attempts. Restart the service once Atlas is reachable.');
        return;
      }
      const delay = attempt * 3000;
      console.log(`⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on http://localhost:${PORT}`);
  });
  await connectWithRetry();
};

startServer();
