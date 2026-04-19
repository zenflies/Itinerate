const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

// ── Helpers ───────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, firstName: user.first_name },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function safeUser(user) {
  // Never return password_hash to the client
  const { password_hash, ...safe } = user;
  return safe;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName = '', email, password } = req.body;

    // Basic validation
    if (!firstName || !email || !password) {
      return res.status(400).json({ error: 'firstName, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const db = getDB();

    // Check for duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(firstName.trim(), lastName.trim(), email.toLowerCase().trim(), passwordHash);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = signToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: safeUser(newUser)
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

    if (!user) {
      // Use same message as wrong password to avoid email enumeration
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: safeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /api/auth/me  (verify token + return current user) ───────────────────
router.get('/me', requireAuth, (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/auth/profile  (update name) ─────────────────────────────────────
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName) return res.status(400).json({ error: 'firstName is required.' });

    const db = getDB();
    db.prepare(`
      UPDATE users SET first_name = ?, last_name = ? WHERE id = ?
    `).run(firstName.trim(), (lastName || '').trim(), req.user.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({ user: safeUser(updated) });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
