const express = require('express');
const { getDB } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin auth
router.use(requireAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const db = getDB();
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalItineraries = db.prepare('SELECT COUNT(*) as count FROM itineraries').get().count;
  const totalAdmins = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get().count;
  const recentUsers = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE created_at >= datetime("now", "-7 days")'
  ).get().count;
  res.json({ totalUsers, totalItineraries, totalAdmins, recentUsers });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', (req, res) => {
  const db = getDB();
  const users = db.prepare(
    'SELECT id, first_name, last_name, email, is_admin, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete('/users/:id', (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }
  const db = getDB();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ message: 'User deleted.' });
});

// ── PUT /api/admin/users/:id/admin ────────────────────────────────────────────
router.put('/users/:id/admin', (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own admin status.' });
  }
  const db = getDB();
  const user = db.prepare('SELECT id, is_admin FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const newStatus = user.is_admin === 1 ? 0 : 1;
  db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newStatus, targetId);
  res.json({ message: newStatus === 1 ? 'User promoted to admin.' : 'Admin rights removed.', is_admin: newStatus });
});

// ── GET /api/admin/itineraries ────────────────────────────────────────────────
router.get('/itineraries', (req, res) => {
  const db = getDB();
  const itineraries = db.prepare(`
    SELECT i.id, i.user_id, i.destination_id, i.destination_name, i.personality_type,
           i.departure_date, i.return_date, i.saved_at, i.updated_at,
           u.first_name, u.last_name, u.email
    FROM itineraries i
    JOIN users u ON u.id = i.user_id
    ORDER BY i.saved_at DESC
  `).all();
  res.json({ itineraries });
});

// ── DELETE /api/admin/itineraries/:id ─────────────────────────────────────────
router.delete('/itineraries/:id', (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT id FROM itineraries WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Itinerary not found.' });
  db.prepare('DELETE FROM itineraries WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Itinerary deleted.' });
});

module.exports = router;
