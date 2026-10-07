import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import valasRouter from './routes/valas.js';
import placesRouter from './routes/places.js';
import scannerRouter from './routes/scanner.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Travel Assistant Japan API',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/valas', valasRouter);
app.use('/api/places', placesRouter);
app.use('/api/scanner', scannerRouter);

// Serve static frontend in production (dist directory)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback route for SPA
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Travel Assistant Backend running on http://0.0.0.0:${PORT}`);
});
