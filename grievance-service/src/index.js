require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const grievanceRoutes = require('./routes/grievance');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

app.use('/api/grievances', grievanceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'grievance-service', port: PORT });
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
      console.log('✅ MongoDB connected (grievance-service)');
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
    console.log(`🚀 Grievance Service running on http://localhost:${PORT}`);
  });
  await connectWithRetry();
};

startServer();
