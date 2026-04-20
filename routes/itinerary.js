const express = require('express');
const { getDB } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All itinerary routes require authentication
router.use(requireAuth);

// ── POST /api/itinerary  — save (upsert) an itinerary ─────────────────────────
router.post('/', (req, res) => {
  try {
    const { destinationId, destinationName, personalityType, itinerary, flight, hotel } = req.body;

    if (!destinationId || !destinationName || !personalityType || !itinerary) {
      return res.status(400).json({
        error: 'destinationId, destinationName, personalityType, and itinerary are required.'
      });
    }

    const db = getDB();
    const itineraryJson = JSON.stringify(itinerary);
    const flightJson    = flight ? JSON.stringify(flight) : null;
    const hotelJson     = hotel  ? JSON.stringify(hotel)  : null;

    // Upsert: if user already has a saved itinerary for this destination, overwrite it
    db.prepare(`
      INSERT INTO itineraries (user_id, destination_id, destination_name, personality_type, itinerary_json, flight_json, hotel_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (user_id, destination_id)
      DO UPDATE SET
        destination_name = excluded.destination_name,
        personality_type = excluded.personality_type,
        itinerary_json   = excluded.itinerary_json,
        flight_json      = excluded.flight_json,
        hotel_json       = excluded.hotel_json,
        updated_at       = datetime('now')
    `).run(req.user.id, destinationId, destinationName, personalityType, itineraryJson, flightJson, hotelJson);

    const saved = db.prepare(`
      SELECT * FROM itineraries WHERE user_id = ? AND destination_id = ?
    `).get(req.user.id, destinationId);

    return res.status(201).json({
      message: `Itinerary for ${destinationName} saved successfully.`,
      itinerary: formatItinerary(saved)
    });
  } catch (err) {
    console.error('Save itinerary error:', err);
    return res.status(500).json({ error: 'Server error saving itinerary.' });
  }
});

// ── GET /api/itinerary  — list all saved itineraries for the user ─────────────
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const rows = db.prepare(`
      SELECT * FROM itineraries WHERE user_id = ? ORDER BY updated_at DESC
    `).all(req.user.id);

    return res.json({
      itineraries: rows.map(formatItinerary)
    });
  } catch (err) {
    console.error('List itineraries error:', err);
    return res.status(500).json({ error: 'Server error fetching itineraries.' });
  }
});

// ── GET /api/itinerary/:destinationId  — get one saved itinerary ──────────────
router.get('/:destinationId', (req, res) => {
  try {
    const db = getDB();
    const row = db.prepare(`
      SELECT * FROM itineraries WHERE user_id = ? AND destination_id = ?
    `).get(req.user.id, req.params.destinationId);

    if (!row) {
      return res.status(404).json({ error: 'No saved itinerary found for that destination.' });
    }

    return res.json({ itinerary: formatItinerary(row) });
  } catch (err) {
    console.error('Get itinerary error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/itinerary/:destinationId  — remove a saved itinerary ──────────
router.delete('/:destinationId', (req, res) => {
  try {
    const db = getDB();
    const result = db.prepare(`
      DELETE FROM itineraries WHERE user_id = ? AND destination_id = ?
    `).run(req.user.id, req.params.destinationId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'No itinerary found to delete.' });
    }

    return res.json({ message: 'Itinerary deleted.' });
  } catch (err) {
    console.error('Delete itinerary error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/itinerary/quiz/save  — save quiz result ─────────────────────────
router.post('/quiz/save', (req, res) => {
  try {
    const { personalityType, answers } = req.body;

    if (!personalityType || !answers) {
      return res.status(400).json({ error: 'personalityType and answers are required.' });
    }

    const db = getDB();
    const result = db.prepare(`
      INSERT INTO quiz_results (user_id, personality_type, answers_json)
      VALUES (?, ?, ?)
    `).run(req.user.id, personalityType, JSON.stringify(answers));

    return res.status(201).json({
      message: 'Quiz result saved.',
      quizResultId: result.lastInsertRowid,
      personalityType
    });
  } catch (err) {
    console.error('Save quiz error:', err);
    return res.status(500).json({ error: 'Server error saving quiz result.' });
  }
});

// ── GET /api/itinerary/quiz/latest  — get most recent quiz result ─────────────
router.get('/quiz/latest', (req, res) => {
  try {
    const db = getDB();
    const row = db.prepare(`
      SELECT * FROM quiz_results WHERE user_id = ? ORDER BY taken_at DESC LIMIT 1
    `).get(req.user.id);

    if (!row) {
      return res.status(404).json({ error: 'No quiz result found.' });
    }

    return res.json({
      personalityType: row.personality_type,
      answers: JSON.parse(row.answers_json),
      takenAt: row.taken_at
    });
  } catch (err) {
    console.error('Get quiz error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Helper: parse itinerary_json back to object ───────────────────────────────
function formatItinerary(row) {
  return {
    id: row.id,
    destinationId: row.destination_id,
    destinationName: row.destination_name,
    personalityType: row.personality_type,
    itinerary: JSON.parse(row.itinerary_json),
    flight: row.flight_json ? JSON.parse(row.flight_json) : null,
    hotel:  row.hotel_json  ? JSON.parse(row.hotel_json)  : null,
    savedAt: row.saved_at,
    updatedAt: row.updated_at
  };
}

module.exports = router;
