require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const itineraryRoutes = require('./routes/itinerary');
const contactRoutes = require('./routes/contact');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── Serve static frontend files ─────────────────────────────────────────────
// Place your HTML/CSS/JS in a `public/` folder alongside server.js
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/ai', aiRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Fallback: serve index.html for SPA routing ────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Boot ──────────────────────────────────────────────────────────────────────
initDB();
app.listen(PORT, () => {
  console.log(`\n🌍 Itinerate backend running on http://localhost:${PORT}`);
  console.log(`   → API: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
