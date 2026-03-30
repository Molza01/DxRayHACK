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

    // Drop legacy indexes that don't include userId (replaced by userId-scoped indexes)
    try {
      const Build = require('./models/Build');
      const Doc = require('./models/Doc');
      const buildIndexes = await Build.collection.indexes();
      for (const idx of buildIndexes) {
        // Drop old {runId, platform} unique index without userId
        if (idx.unique && idx.key?.runId && !idx.key?.userId) {
          await Build.collection.dropIndex(idx.name);
          console.log('Dropped legacy Build index:', idx.name);
        }
      }
      const docIndexes = await Doc.collection.indexes();
      for (const idx of docIndexes) {
        // Drop old {repoName, path} unique index without userId
        if (idx.unique && idx.key?.repoName && idx.key?.path && !idx.key?.userId) {
          await Doc.collection.dropIndex(idx.name);
          console.log('Dropped legacy Doc index:', idx.name);
        }
      }
    } catch (e) {
      // Indexes may not exist — safe to ignore
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
