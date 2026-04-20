const express = require('express');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PERSONALITY_LABELS = {
  adventure: 'The Bold Adventurer — thrills, outdoor extremes, spontaneity, nature',
  cultural:  'The Cultural Explorer — history, art, local life, deep understanding',
  relaxation:'The Relaxation Seeker — slow travel, beaches, spas, scenic beauty',
  luxury:    'The Luxury Connoisseur — fine dining, 5-star hotels, exclusive experiences',
  introvert: 'The Quiet Wanderer — hidden gems, solitude, off-beaten-path, peaceful',
  foodie:    'The Culinary Traveler — street food, local markets, Michelin dining, flavors'
};

// ── POST /api/ai/destinations ─────────────────────────────────────────────────
// Returns 4 AI-generated destination recommendations for the personality type
router.post('/destinations', async (req, res) => {
  try {
    const { personalityType, answers } = req.body;
    if (!personalityType) return res.status(400).json({ error: 'personalityType is required.' });

    const personalityLabel = PERSONALITY_LABELS[personalityType] || personalityType;
    const answerSummary = answers
      ? answers.map((a, i) => `Q${i + 1}: ${a.type}`).join(', ')
      : '';

    const prompt = `You are a world-class travel expert. Based on this traveler's personality type, recommend exactly 4 unique and diverse travel destinations worldwide.

Traveler personality: ${personalityLabel}
Quiz answer types: ${answerSummary}

Return a JSON object with a "destinations" array of exactly 4 items. Each destination must follow this exact schema:
{
  "id": "lowercase-hyphenated-slug",
  "name": "City or Region Name",
  "country": "Country Name",
  "emoji": "single relevant emoji",
  "gradient": "linear-gradient(135deg, #hexcolor1 0%, #hexcolor2 100%)",
  "tagline": "short evocative tagline under 10 words",
  "description": "2-3 sentence vivid description of why this destination suits this traveler",
  "types": ["array of 1-3 personality types from: adventure, cultural, relaxation, luxury, introvert, foodie"],
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "bestFor": "Short label matching personality",
  "duration": "5 days",
  "budget": "$ or $$ or $$$ or $$$$",
  "match": number between 88 and 99
}

Make the destinations diverse in geography, culture, and price. Make them genuinely suited to the personality. Be creative — do not always pick the most obvious tourist destinations.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1500
    });

    const data = JSON.parse(completion.choices[0].message.content);
    if (!data.destinations || !Array.isArray(data.destinations)) {
      return res.status(500).json({ error: 'Invalid AI response format.' });
    }

    return res.json({ destinations: data.destinations.slice(0, 4) });
  } catch (err) {
    console.error('AI destinations error:', err);
    return res.status(500).json({ error: 'Failed to generate destinations.' });
  }
});

// ── POST /api/ai/package ──────────────────────────────────────────────────────
// Returns AI-generated flights, hotels, and 5-day itinerary for a destination
router.post('/package', async (req, res) => {
  try {
    const { destination, personalityType, departureDate, returnDate, departureCity = 'New York (JFK)' } = req.body;
    if (!destination || !personalityType) {
      return res.status(400).json({ error: 'destination and personalityType are required.' });
    }

    const personalityLabel = PERSONALITY_LABELS[personalityType] || personalityType;
    const destSlug = destination.id || destination.name.toLowerCase().replace(/\s+/g, '-');

    const dateContext = departureDate
      ? `The traveler departs on ${departureDate} and returns on ${returnDate} (5 nights at the destination). Use these exact dates in all flight and itinerary details. Flight prices should reflect realistic seasonal pricing for these dates.`
      : 'No specific dates provided — use typical mid-season pricing.';

    const prompt = `You are a world-class travel expert. Generate a complete travel package for a ${personalityLabel} visiting ${destination.name}, ${destination.country}.

${dateContext}

Return a JSON object with exactly this structure:

{
  "flights": [
    {
      "id": "${destSlug}-f1",
      "airline": "Real airline name",
      "badge": "country flag or airline emoji",
      "flightNumber": "XX 123",
      "from": "${departureCity}",
      "to": "${destination.name} (AIRPORT_CODE)",
      "date": "${departureDate || 'TBD'}",
      "departure": "10:00 AM",
      "arrival": "8:00 PM +1",
      "duration": "10h 00m",
      "stops": "Nonstop or '1 stop · City (CODE)'",
      "price": number (realistic USD economy price for the travel date),
      "class": "Economy",
      "perks": ["Perk 1", "Perk 2", "Perk 3", "Perk 4"]
    }
  ],
  "hotels": [
    {
      "id": "${destSlug}-h1",
      "name": "Real or realistic hotel name",
      "stars": 4 or 5,
      "type": "Hotel category description",
      "neighborhood": "Specific neighborhood or area",
      "price": number (realistic USD per night),
      "image": "single relevant emoji",
      "description": "2-3 sentence vivid hotel description suited to this traveler",
      "amenities": ["Amenity 1", "Amenity 2", "Amenity 3", "Amenity 4", "Amenity 5", "Amenity 6"]
    }
  ],
  "itinerary": {
    "title": "Evocative trip title for ${destination.name}",
    "days": [
      {
        "title": "Day theme title",
        "morning": { "title": "Activity name", "desc": "2-3 sentence description with practical details", "tags": ["tag1", "tag2"] },
        "afternoon": { "title": "Activity name", "desc": "2-3 sentence description with practical details", "tags": ["tag1"] },
        "evening": { "title": "Activity name", "desc": "2-3 sentence description with practical details", "tags": ["tag1", "tag2"] }
      }
    ]
  }
}

Requirements:
- flights: exactly 3 outbound options (${departureCity} → ${destination.name}) — economy budget, economy mid-range, business/first class
- hotels: exactly 3 options — luxury (5-star), boutique (4-star), value (3-4 star)
- itinerary: exactly 5 days tailored to the ${personalityLabel} personality
- Tags for itinerary activities must be from: culture, nature, food, adventure, relax, hidden
- Make it genuinely specific to ${destination.name} with real landmarks, local experiences, and accurate travel details
- Hotel and flight prices should be realistic for the destination`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 5000
    });

    const choice = completion.choices[0];
    if (choice.finish_reason === 'length') {
      console.warn('AI package response was cut off (finish_reason: length). Increase max_tokens if this persists.');
    }

    const data = JSON.parse(choice.message.content);

    if (!data.flights || !data.hotels || !data.itinerary) {
      return res.status(500).json({ error: 'Invalid AI response format.' });
    }

    return res.json({
      flights:   data.flights.slice(0, 3),
      hotels:    data.hotels.slice(0, 3),
      itinerary: data.itinerary
    });
  } catch (err) {
    console.error('AI package error:', err);
    return res.status(500).json({ error: 'Failed to generate travel package.' });
  }
});

// ── POST /api/ai/return-flights ───────────────────────────────────────────────
// Dedicated endpoint — generates only the 3 return flight options
router.post('/return-flights', async (req, res) => {
  try {
    const { destination, returnDate, departureCity = 'New York (JFK)' } = req.body;
    if (!destination) return res.status(400).json({ error: 'destination is required.' });

    const destSlug = destination.id || destination.name.toLowerCase().replace(/\s+/g, '-');
    const dateNote = returnDate && returnDate !== 'TBD'
      ? `The return date is ${returnDate}.`
      : 'Use typical mid-season pricing.';

    const prompt = `You are a flight booking expert. Generate exactly 3 return flight options from ${destination.name}, ${destination.country} back to ${departureCity}. ${dateNote}

Return a JSON object with a "returnFlights" array of exactly 3 items — a budget economy option, a mid-range economy option, and a business or first class option.

Each item in the array must have these string/number fields:
- id: use "${destSlug}-rf1", "${destSlug}-rf2", "${destSlug}-rf3"
- airline: real airline name that operates this route
- badge: flag emoji of the airline home country
- flightNumber: e.g. "JL 006"
- from: departure airport, e.g. "Tokyo (NRT)"
- to: arrival airport, e.g. "${departureCity}"
- date: "${returnDate || 'TBD'}"
- departure: departure time e.g. "10:30 AM"
- arrival: arrival time e.g. "9:45 AM"
- duration: e.g. "13h 30m"
- stops: e.g. "Nonstop" or "1 stop via Seoul (ICN)"
- price: integer USD price
- class: "Economy", "Business", or "First Class"
- perks: array of 4 short perk strings`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1200
    });

    const data = JSON.parse(completion.choices[0].message.content);
    const returnFlights = (data.returnFlights || []).slice(0, 3);

    return res.json({ returnFlights });
  } catch (err) {
    console.error('AI return-flights error:', err);
    return res.status(500).json({ error: 'Failed to generate return flights.' });
  }
});

module.exports = router;
