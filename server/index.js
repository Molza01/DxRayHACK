const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => res.json({ message: 'DxRayHack API is running' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Connect to MongoDB and start server
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Please add it to your environment variables.');
  process.exit(1);
}

console.log('Connecting to MongoDB...');

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Drop legacy runId unique index if it exists (replaced by compound index {runId, platform})
    try {
      const Build = require('./models/Build');
      const indexes = await Build.collection.indexes();
      const legacyIdx = indexes.find((idx) => idx.key?.runId && !idx.key?.platform && idx.unique);
      if (legacyIdx) {
        await Build.collection.dropIndex(legacyIdx.name);
        console.log('Dropped legacy runId unique index');
      }
    } catch (e) {
      // Index may not exist — safe to ignore
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
