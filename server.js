require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const itineraryRoutes = require('./routes/itinerary');

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

// ── AI Chatbot Route ─────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are the friendly, helpful AI support chatbot for 'Itinerate', an automated travel planning application.
You are chatting live with a user on our website.

Rules:
1. Read the user's input carefully.
2. Provide a short, helpful, and conversational response (1-2 sentences).
3. If they are reporting a bug or asking a complex question you cannot answer, 
   politely apologize and ask them to email support at travel.itinerate@gmail.com.

User Message:
${message}`;

    const result = await model.generateContent(systemPrompt);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: 'Sorry, I am having trouble connecting to the AI.' });
  }
});

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
