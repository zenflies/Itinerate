/* ===== ITINERATE APP — with Backend API Integration ===== */

// ── API Configuration ─────────────────────────────────────────────────────────
// When running locally with the backend: 'http://localhost:3000/api'
// When deployed, change this to your production URL e.g. 'https://api.itinerate.co/api'
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
  ? 'http://localhost:3000/api'
  : '/api';  // Same-origin when frontend is served by the Express server

// ── Token helpers ─────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('itinerate_token'); }
function setToken(t) { localStorage.setItem('itinerate_token', t); }
function clearToken() { localStorage.removeItem('itinerate_token'); }

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ===== STATE =====
const state = {
  currentPage: 'home',
  user: null,
  quizStep: 0,
  quizAnswers: [],
  personalityType: null,
  selectedDestination: null,
  selectedFlight: null,
  selectedReturnFlight: null,
  selectedHotel: null,
  savedItinerary: false
};

// ===== QUIZ DATA =====
const quizQuestions = [
  {
    id: 1,
    category: "Planning Style",
    question: "How do you prefer to plan your trips?",
    options: [
      { text: "Book only flights — I figure out the rest when I arrive", type: "adventure" },
      { text: "Research and plan most activities in advance", type: "cultural" },
      { text: "Book a fully curated package with everything arranged", type: "luxury" }
    ]
  },
  {
    id: 2,
    category: "Travel Pace",
    question: "What's your ideal travel pace on vacation?",
    options: [
      { text: "Fast-paced — see and do as much as possible every day", type: "adventure" },
      { text: "Moderate — balance activities with unstructured downtime", type: "cultural" },
      { text: "Slow — deeply immerse in a few special experiences", type: "relaxation" }
    ]
  },
  {
    id: 3,
    category: "Activities",
    question: "Which activities excite you most when traveling?",
    options: [
      { text: "Hiking, surfing, skydiving, and adventure sports", type: "adventure" },
      { text: "Museums, historical sites, local markets, and cultural shows", type: "cultural" },
      { text: "Spa days, beach lounging, scenic boat rides, and yoga", type: "relaxation" }
    ]
  },
  {
    id: 4,
    category: "Social Style",
    question: "Who do you prefer to travel with?",
    options: [
      { text: "Solo or with just one close friend — intimate experiences", type: "introvert" },
      { text: "A small group of 3–5 friends or family", type: "cultural" },
      { text: "The more the merrier — I love meeting new people!", type: "adventure" }
    ]
  },
  {
    id: 5,
    category: "Accommodation",
    question: "What's your preferred place to stay?",
    options: [
      { text: "Camping, hostels, or unique local stays like treehouses", type: "adventure" },
      { text: "Cozy boutique hotels or charming Airbnbs", type: "cultural" },
      { text: "5-star resorts with all the amenities and service", type: "luxury" }
    ]
  },
  {
    id: 6,
    category: "Food Philosophy",
    question: "When it comes to food while traveling?",
    options: [
      { text: "Street food all day — I eat whatever locals eat", type: "foodie" },
      { text: "A good mix of local gems and well-known restaurants", type: "cultural" },
      { text: "Fine dining, tasting menus, and curated culinary experiences", type: "luxury" }
    ]
  },
  {
    id: 7,
    category: "Environment",
    question: "Your ideal travel environment is...",
    options: [
      { text: "Wild mountains, dense forests, or untouched natural landscapes", type: "adventure" },
      { text: "Historic city centers, ancient ruins, or vibrant cultural hubs", type: "cultural" },
      { text: "Tropical beaches, crystal water, or peaceful island settings", type: "relaxation" }
    ]
  },
  {
    id: 8,
    category: "Core Values",
    question: "What matters most to you in a perfect trip?",
    options: [
      { text: "Adrenaline, pushing my limits, and unforgettable stories", type: "adventure" },
      { text: "Learning, connecting with locals, and understanding the world", type: "cultural" },
      { text: "Rest, beauty, indulgence, and complete peace of mind", type: "relaxation" }
    ]
  }
];

// ===== PERSONALITY TYPES =====
const personalityTypes = {
  adventure: {
    id: "adventure",
    emoji: "🧗",
    title: "The Bold Adventurer",
    description: "You crave adrenaline and thrive on the unexpected. You travel to push your limits, explore untamed landscapes, and collect stories no one else has. The road less traveled is your natural habitat.",
    traits: ["Thrill-Seeker", "Explorer", "Spontaneous", "Bold", "Nature-Lover"],
    color: "#EF4444"
  },
  cultural: {
    id: "cultural",
    emoji: "🎭",
    title: "The Cultural Explorer",
    description: "Travel is your classroom. You dive deep into history, art, and local life — seeking to truly understand the places you visit. You leave each destination with a richer view of humanity.",
    traits: ["Curious", "Thoughtful", "History-Buff", "Art-Lover", "Deep Thinker"],
    color: "#6366F1"
  },
  relaxation: {
    id: "relaxation",
    emoji: "🌅",
    title: "The Relaxation Seeker",
    description: "Your ideal trip is one where time slows down. You value beauty, peace, and the simple pleasure of doing absolutely nothing perfectly. Sunsets, ocean views, and spa mornings are your language.",
    traits: ["Peaceful", "Mindful", "Scenic", "Rejuvenating", "Unhurried"],
    color: "#0EA5E9"
  },
  luxury: {
    id: "luxury",
    emoji: "✨",
    title: "The Luxury Connoisseur",
    description: "You believe the finest details make the best memories. From Michelin-starred dinners to private overwater villas, you travel with intention and a taste for the extraordinary.",
    traits: ["Refined", "Discerning", "Indulgent", "Elegant", "Detail-Oriented"],
    color: "#F59E0B"
  },
  introvert: {
    id: "introvert",
    emoji: "🌿",
    title: "The Quiet Wanderer",
    description: "You seek places that feel like well-kept secrets. Crowded tourist traps drain you; instead, you find magic in untouched corners, peaceful mornings, and the stillness of untouched nature.",
    traits: ["Reflective", "Authentic", "Off-the-Beaten-Path", "Peaceful", "Solo-Minded"],
    color: "#10B981"
  },
  foodie: {
    id: "foodie",
    emoji: "🍜",
    title: "The Culinary Traveler",
    description: "For you, a trip is best measured in meals. From street-side stalls to secret local spots, food is your compass. Every dish tells the story of a place — and you eat every chapter.",
    traits: ["Epicurean", "Curious", "Adventurous Eater", "Market-Lover", "Flavor-Chaser"],
    color: "#F97316"
  }
};

// ===== DESTINATIONS =====
const allDestinations = [
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    emoji: "⛩️",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    tagline: "Ancient temples meet timeless beauty",
    description: "Kyoto is Japan's cultural soul — a city where bamboo groves, zen gardens, and 1,600-year-old temples coexist with world-class cuisine and refined ryokan stays.",
    types: ["cultural", "foodie", "introvert"],
    tags: ["Cultural", "Temples", "Cuisine", "Zen"],
    bestFor: "Cultural Explorer",
    duration: "5 days",
    budget: "$$",
    match: 97
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    emoji: "🌺",
    gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    tagline: "Where spirituality meets serenity",
    description: "Bali is an island of infinite calm and gentle beauty. Rice terraces, healing retreats, surf breaks, and a deep spiritual culture make it perfect for those seeking transformation.",
    types: ["relaxation", "introvert", "adventure"],
    tags: ["Wellness", "Beaches", "Spiritual", "Surfing"],
    bestFor: "Relaxation Seeker",
    duration: "5 days",
    budget: "$$",
    match: 95
  },
  {
    id: "patagonia",
    name: "Patagonia",
    country: "Chile & Argentina",
    emoji: "🏔️",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    tagline: "The edge of the world awaits",
    description: "Patagonia is one of earth's last true wildernesses. Towering granite peaks, glacial lakes, and endless trails make it the ultimate destination for adventurers who want to feel small.",
    types: ["adventure", "introvert"],
    tags: ["Hiking", "Mountains", "Wildlife", "Remote"],
    bestFor: "Bold Adventurer",
    duration: "5 days",
    budget: "$$$",
    match: 99
  },
  {
    id: "santorini",
    name: "Santorini",
    country: "Greece",
    emoji: "🏛️",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    tagline: "Sunsets, sea, and pure Mediterranean bliss",
    description: "Santorini is a dream made real. Clifftop villages draped in white and blue, world-class volcanic wine, and sunsets that stop time — a masterpiece of nature and civilization.",
    types: ["luxury", "relaxation"],
    tags: ["Luxury", "Sunsets", "Wine", "Romantic"],
    bestFor: "Luxury Connoisseur",
    duration: "5 days",
    budget: "$$$",
    match: 94
  },
  {
    id: "iceland",
    name: "Iceland",
    country: "Iceland",
    emoji: "🌌",
    gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    tagline: "Where auroras paint the sky",
    description: "Iceland is a land of elemental wonder — midnight sun in summer, northern lights in winter, volcanic hot springs, roaring waterfalls, and a silence that restores the soul.",
    types: ["introvert", "adventure"],
    tags: ["Auroras", "Waterfalls", "Hot Springs", "Remote"],
    bestFor: "Quiet Wanderer",
    duration: "5 days",
    budget: "$$$",
    match: 96
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    emoji: "🎨",
    gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    tagline: "Art, architecture, and endless tapas",
    description: "Barcelona is a feast for every sense. Gaudí's surreal architecture, golden beaches, Michelin-starred pintxos, and a nightlife that begins at midnight — Europe's most alive city.",
    types: ["cultural", "foodie"],
    tags: ["Architecture", "Food", "Art", "Beach"],
    bestFor: "Cultural Explorer",
    duration: "5 days",
    budget: "$$",
    match: 93
  },
  {
    id: "maldives",
    name: "Maldives",
    country: "Maldives",
    emoji: "🌊",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    tagline: "Paradise, defined",
    description: "The Maldives is the world's finest escape — overwater bungalows floating above translucent lagoons, neon coral reefs, and a gentleness that feels almost unreal.",
    types: ["luxury", "relaxation"],
    tags: ["Overwater Villas", "Snorkeling", "Isolation", "Luxury"],
    bestFor: "Luxury Connoisseur",
    duration: "5 days",
    budget: "$$$$",
    match: 91
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    emoji: "🗼",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    tagline: "The future, reimagined daily",
    description: "Tokyo is sensory overload in the best possible way. Ramen at 2am, robot cafes, silent shrines in skyscraper shadows, and a food scene that has no equal anywhere on earth.",
    types: ["foodie", "cultural", "adventure"],
    tags: ["Food", "Technology", "Culture", "Urban"],
    bestFor: "Culinary Traveler",
    duration: "5 days",
    budget: "$$",
    match: 98
  }
];

// ===== FLIGHT DATA =====
const flightData = {
  kyoto: [
    { id: 'ky-f1', airline: 'Japan Airlines', badge: '🇯🇵', flightNumber: 'JL 061', from: 'New York (JFK)', to: 'Osaka (KIX)', departure: '11:30 AM', arrival: '3:45 PM +1', duration: '14h 15m', stops: 'Nonstop', price: 847, class: 'Economy', perks: ['In-flight meals included', 'On-demand entertainment', '2 checked bags', 'USB charging at seat'] },
    { id: 'ky-f2', airline: 'United Airlines', badge: '✈️', flightNumber: 'UA 837', from: 'New York (JFK)', to: 'Osaka (KIX)', departure: '1:15 PM', arrival: '9:45 PM +1', duration: '17h 30m', stops: '1 stop · Tokyo (NRT)', price: 623, class: 'Economy', perks: ['Snacks & drinks', 'In-seat USB power', '1 checked bag', 'MileagePlus miles earned'] },
    { id: 'ky-f3', airline: 'All Nippon Airways', badge: '🌸', flightNumber: 'NH 010', from: 'New York (JFK)', to: 'Osaka (KIX)', departure: '10:50 AM', arrival: '2:30 PM +1', duration: '14h 05m', stops: 'Nonstop', price: 2890, class: 'Business', perks: ['Lie-flat business suite', 'Fine dining & sake pairing', '2 bags + priority handling', 'Airport lounge access', 'Premium amenity kit'] }
  ],
  bali: [
    { id: 'ba-f1', airline: 'Singapore Airlines', badge: '🇸🇬', flightNumber: 'SQ 478', from: 'New York (JFK)', to: 'Denpasar (DPS)', departure: '10:30 AM', arrival: '11:55 PM +1', duration: '24h 25m', stops: '1 stop · Singapore (SIN)', price: 1120, class: 'Economy', perks: ['KrisFlyer miles earned', 'World-class in-flight dining', '2 checked bags', 'Award-winning entertainment'] },
    { id: 'ba-f2', airline: 'Cathay Pacific', badge: '✈️', flightNumber: 'CX 841', from: 'New York (JFK)', to: 'Denpasar (DPS)', departure: '12:45 PM', arrival: '9:15 AM +2', duration: '22h 30m', stops: '1 stop · Hong Kong (HKG)', price: 934, class: 'Economy', perks: ['Complimentary meals', 'USB & AC power', '1 checked bag', 'Asia Miles earned'] },
    { id: 'ba-f3', airline: 'Emirates', badge: '🇦🇪', flightNumber: 'EK 388', from: 'New York (JFK)', to: 'Denpasar (DPS)', departure: '9:15 PM', arrival: '4:30 PM +2', duration: '26h 15m', stops: '1 stop · Dubai (DXB)', price: 3450, class: 'Business', perks: ['Private lie-flat suite', 'Onboard bar & lounge', '2 bags priority', 'Dubai airport lounge', 'Chauffeur service'] }
  ],
  patagonia: [
    { id: 'pa-f1', airline: 'LATAM Airlines', badge: '🇨🇱', flightNumber: 'LA 500', from: 'Miami (MIA)', to: 'Punta Arenas (PUQ)', departure: '8:00 AM', arrival: '10:25 PM', duration: '14h 25m', stops: '1 stop · Santiago (SCL)', price: 1230, class: 'Economy', perks: ['Complimentary meals', 'Personal entertainment screen', '1 checked bag', 'LATAM Pass miles'] },
    { id: 'pa-f2', airline: 'American Airlines', badge: '✈️', flightNumber: 'AA 903', from: 'New York (JFK)', to: 'Punta Arenas (PUQ)', departure: '6:30 AM', arrival: '11:55 PM', duration: '18h 25m', stops: '2 stops · Miami + Santiago', price: 987, class: 'Economy', perks: ['Snacks included', 'In-seat power', '1 checked bag', 'AAdvantage miles'] },
    { id: 'pa-f3', airline: 'LATAM Airlines', badge: '🇨🇱', flightNumber: 'LA 500', from: 'Miami (MIA)', to: 'Punta Arenas (PUQ)', departure: '8:00 AM', arrival: '10:25 PM', duration: '14h 25m', stops: '1 stop · Santiago (SCL)', price: 2760, class: 'Business', perks: ['Premium lie-flat seat', 'Gourmet 3-course meals', '2 bags priority', 'Lounge access in Santiago', 'Dedicated check-in'] }
  ],
  santorini: [
    { id: 'sa-f1', airline: 'Aegean Airlines', badge: '🇬🇷', flightNumber: 'A3 601', from: 'New York (JFK)', to: 'Santorini (JTR)', departure: '6:00 PM', arrival: '4:45 PM +1', duration: '16h 45m', stops: '1 stop · Athens (ATH)', price: 780, class: 'Economy', perks: ['Miles+Bonus earned', 'Complimentary meals', '1 checked bag', 'Award-winning service'] },
    { id: 'sa-f2', airline: 'Lufthansa', badge: '🇩🇪', flightNumber: 'LH 400', from: 'New York (JFK)', to: 'Santorini (JTR)', departure: '5:30 PM', arrival: '5:20 PM +1', duration: '17h 50m', stops: '1 stop · Frankfurt (FRA)', price: 892, class: 'Economy', perks: ['Complimentary dining', 'In-seat entertainment', '1 checked bag', 'Miles & More earned'] },
    { id: 'sa-f3', airline: 'Olympic Air + Aegean', badge: '✨', flightNumber: 'OA / A3', from: 'New York (JFK)', to: 'Santorini (JTR)', departure: '6:00 PM', arrival: '4:45 PM +1', duration: '16h 45m', stops: '1 stop · Athens (ATH)', price: 1890, class: 'Business', perks: ['Business class to Athens', 'Priority connection', 'Private lounge', '2 bags priority', 'Fast-track immigration'] }
  ],
  iceland: [
    { id: 'ic-f1', airline: 'Icelandair', badge: '🇮🇸', flightNumber: 'FI 631', from: 'New York (JFK)', to: 'Reykjavik (KEF)', departure: '5:15 PM', arrival: '6:00 AM +1', duration: '5h 45m', stops: 'Nonstop', price: 489, class: 'Economy', perks: ['Saga Club miles', 'In-seat entertainment', '1 checked bag', 'Iceland stopover options'] },
    { id: 'ic-f2', airline: 'Delta Air Lines', badge: '✈️', flightNumber: 'DL 404', from: 'New York (JFK)', to: 'Reykjavik (KEF)', departure: '9:15 PM', arrival: '12:30 PM +1', duration: '10h 15m', stops: '1 stop · Amsterdam (AMS)', price: 567, class: 'Economy', perks: ['SkyMiles earned', 'Complimentary snacks', '1 checked bag', 'In-seat entertainment'] },
    { id: 'ic-f3', airline: 'Icelandair', badge: '🇮🇸', flightNumber: 'FI 631', from: 'New York (JFK)', to: 'Reykjavik (KEF)', departure: '5:15 PM', arrival: '6:00 AM +1', duration: '5h 45m', stops: 'Nonstop', price: 1240, class: 'Saga Class (Business)', perks: ['Lie-flat business seat', 'Fine Nordic dining', '2 bags priority', 'Saga Lounge access', 'Dedicated check-in'] }
  ],
  barcelona: [
    { id: 'bc-f1', airline: 'Iberia', badge: '🇪🇸', flightNumber: 'IB 6251', from: 'New York (JFK)', to: 'Barcelona (BCN)', departure: '9:00 PM', arrival: '10:55 AM +1', duration: '8h 55m', stops: 'Nonstop', price: 620, class: 'Economy', perks: ['Iberia Plus miles', 'Complimentary meals', '1 checked bag', 'Entertainment on demand'] },
    { id: 'bc-f2', airline: 'American Airlines', badge: '✈️', flightNumber: 'AA 93', from: 'New York (JFK)', to: 'Barcelona (BCN)', departure: '7:15 PM', arrival: '8:50 AM +1', duration: '7h 55m', stops: 'Nonstop', price: 540, class: 'Economy', perks: ['AAdvantage miles', 'Snacks & drinks', '1 checked bag', 'In-seat screens'] },
    { id: 'bc-f3', airline: 'Iberia', badge: '🇪🇸', flightNumber: 'IB 6251', from: 'New York (JFK)', to: 'Barcelona (BCN)', departure: '9:00 PM', arrival: '10:55 AM +1', duration: '8h 55m', stops: 'Nonstop', price: 2340, class: 'Business', perks: ['Fully flat business bed', 'À la carte dining', '2 bags priority', 'Velázquez Lounge access', 'Amenity kit & pyjamas'] }
  ],
  maldives: [
    { id: 'mv-f1', airline: 'Emirates', badge: '🇦🇪', flightNumber: 'EK 601', from: 'New York (JFK)', to: 'Malé (MLE)', departure: '10:35 PM', arrival: '11:45 PM +1', duration: '19h 10m', stops: '1 stop · Dubai (DXB)', price: 1340, class: 'Economy', perks: ['Complimentary dining', 'ICE entertainment system', '2 checked bags', 'Skywards miles'] },
    { id: 'mv-f2', airline: 'Sri Lankan Airlines', badge: '🇱🇰', flightNumber: 'UL 206', from: 'New York (JFK)', to: 'Malé (MLE)', departure: '9:00 PM', arrival: '1:20 AM +2', duration: '22h 20m', stops: '1 stop · Colombo (CMB)', price: 1120, class: 'Economy', perks: ['Sri Lankan cuisine onboard', 'Personal screen', '2 checked bags', 'FlySmiLes miles'] },
    { id: 'mv-f3', airline: 'Emirates', badge: '🇦🇪', flightNumber: 'EK 601', from: 'New York (JFK)', to: 'Malé (MLE)', departure: '10:35 PM', arrival: '11:45 PM +1', duration: '19h 10m', stops: '1 stop · Dubai (DXB)', price: 5600, class: 'First Class', perks: ['Private first class suite', 'Shower spa onboard', '3 bags priority', 'Emirates First Lounge', 'Vintage Dom Pérignon'] }
  ],
  tokyo: [
    { id: 'tk-f1', airline: 'All Nippon Airways', badge: '🌸', flightNumber: 'NH 010', from: 'New York (JFK)', to: 'Tokyo (NRT)', departure: '10:50 AM', arrival: '2:25 PM +1', duration: '13h 35m', stops: 'Nonstop', price: 780, class: 'Economy', perks: ['Japanese cuisine onboard', 'On-demand entertainment', '2 checked bags', 'ANA Mileage Club'] },
    { id: 'tk-f2', airline: 'Japan Airlines', badge: '🇯🇵', flightNumber: 'JL 003', from: 'New York (JFK)', to: 'Tokyo (NRT)', departure: '1:25 PM', arrival: '4:55 PM +1', duration: '13h 30m', stops: 'Nonstop', price: 820, class: 'Economy', perks: ['Gourmet Japanese meals', 'Award-winning entertainment', '2 checked bags', 'JAL Mileage Bank'] },
    { id: 'tk-f3', airline: 'All Nippon Airways', badge: '🌸', flightNumber: 'NH 010', from: 'New York (JFK)', to: 'Tokyo (NRT)', departure: '10:50 AM', arrival: '2:25 PM +1', duration: '13h 35m', stops: 'Nonstop', price: 3200, class: 'Business', perks: ['The Room — full flat suite', 'Kaiseki multi-course dining', '2 bags priority + golf bag', 'ANA Lounge access', 'Turndown service'] }
  ]
};

// ===== HOTEL DATA =====
const hotelData = {
  kyoto: [
    { id: 'ky-h1', name: 'Suiran, a Luxury Collection Hotel', stars: 5, type: 'Luxury Ryokan', neighborhood: 'Arashiyama', price: 520, image: '🏯', description: 'Perched along the Oi River with private views of Arashiyama\'s bamboo grove, Suiran is the pinnacle of Japanese luxury — a ryokan meets world-class resort. Each room blends traditional tatami with modern elegance.', amenities: ['Private Onsen', 'Kaiseki Restaurant', 'Bamboo Grove Views', 'Kimono Rental', 'Butler Service', 'Spa'] },
    { id: 'ky-h2', name: 'The Screen Kyoto', stars: 4, type: 'Boutique Hotel', neighborhood: 'Nakagyo District', price: 280, image: '🎨', description: 'A design-lover\'s sanctuary in the heart of Kyoto — 13 individually designed rooms by different Japanese artists, each telling a story of a different era in Japanese history. Walking distance from Nijo Castle.', amenities: ['Art Gallery On-Site', 'Rooftop Terrace', 'Curated Library', 'Bicycle Rental', 'Evening Sake Service'] },
    { id: 'ky-h3', name: 'Hotel Granvia Kyoto', stars: 4, type: 'City Hotel', neighborhood: 'Kyoto Station', price: 185, image: '🏢', description: 'Directly connected to Kyoto Station with panoramic city views, Granvia offers Japanese and Western rooms with seamless access to all major attractions. A smart base for explorers covering the whole city.', amenities: ['5 On-Site Restaurants', 'Fitness Center', 'Business Center', 'Concierge', 'Express Check-In'] }
  ],
  bali: [
    { id: 'ba-h1', name: 'Four Seasons Resort Jimbaran Bay', stars: 5, type: 'Beachfront Resort', neighborhood: 'Jimbaran Bay', price: 890, image: '🌺', description: 'A barefoot luxury haven on Jimbaran\'s calm bay — private villas with plunge pools, traditional thatched pavilions, and a beach framed by fishing village sunsets. Indonesia\'s gold standard in resort living.', amenities: ['Private Plunge Pools', 'KOSSU Spa', 'Cooking Classes', 'Watersports', 'Three Restaurants', 'Kids Club'] },
    { id: 'ba-h2', name: 'Alaya Resort Ubud', stars: 4, type: 'Jungle Resort', neighborhood: 'Ubud Gorge', price: 220, image: '🌿', description: 'Suspended above a dramatic jungle gorge in central Ubud, Alaya offers 56 suites and villas surrounded by the sound of the Wos River. Traditional Balinese architecture meets modern comfort.', amenities: ['Infinity Pool', 'Spa Alaya', 'Gorge Views', 'Yoga Pavilion', 'Farm-to-Table Restaurant', 'Bicycle Rental'] },
    { id: 'ba-h3', name: 'COMO Shambhala Estate', stars: 5, type: 'Wellness Retreat', neighborhood: 'Ubud Highlands', price: 650, image: '🧘', description: 'The world\'s premier wellness destination in Bali\'s highlands — a private estate where holistic healing, Ayurvedic treatments, and cleanse programs are set among river gorges, jungle paths, and organic gardens.', amenities: ['Holistic Health Programs', 'COMO Shambhala Cuisine', 'Heated Pool', 'Yoga & Pilates', 'Ayurvedic Treatments', 'Personal Nutritionist'] }
  ],
  patagonia: [
    { id: 'pa-h1', name: 'Explora Patagonia', stars: 5, type: 'Luxury Wilderness Lodge', neighborhood: 'Torres del Paine NP', price: 780, image: '🏔️', description: 'The legendary all-inclusive wilderness lodge at the gateway to Torres del Paine — floor-to-ceiling windows frame the Paine Massif, and expert guides lead you to places most travelers never find. All excursions included.', amenities: ['All-Inclusive Excursions', 'Expert Naturalist Guides', 'Spa & Hot Pools', 'Gourmet Patagonian Dining', 'Bar & Lounge', 'Astronomy Deck'] },
    { id: 'pa-h2', name: 'Las Torres Patagonia', stars: 4, type: 'Mountain Hotel', neighborhood: 'Base of Torres', price: 290, image: '⛺', description: 'The closest hotel to the iconic three towers, sitting at the trailhead of the most famous hike in South America. Simple luxury in an extraordinary setting — wake up with the towers glowing orange at sunrise.', amenities: ['Trail Access', 'Hot Tub', 'Regional Cuisine Restaurant', 'Gear Storage', 'Guide Service', 'Bar with Fireplace'] },
    { id: 'pa-h3', name: 'Awasi Patagonia', stars: 5, type: 'Private Villa Lodge', neighborhood: 'Torres del Paine', price: 1100, image: '🌟', description: 'Just 12 private villas on the pampa, each with its own exclusive 4x4 vehicle and dedicated guide. The most intimate, personalized Patagonia experience on earth — every day tailored entirely to you.', amenities: ['Private Vehicle & Guide', 'Heated Villas', 'Chef-Prepared Meals', 'Private Hot Tub', 'Stargazing Sessions', 'Wildlife Photography Excursions'] }
  ],
  santorini: [
    { id: 'sa-h1', name: 'Canaves Oia Epitome', stars: 5, type: 'Cliffside Suite Hotel', neighborhood: 'Oia Village', price: 1200, image: '🏛️', description: 'The most celebrated hotel on Santorini\'s iconic cliffside — exclusive suites carved into the volcanic caldera rock with private infinity pools, butlers, and unobstructed views of the caldera and Thirassia island.', amenities: ['Private Infinity Pools', 'Butler Service', 'Caldera Views', 'Fine Dining Restaurant', 'Spa Cave', 'Complimentary Transfers'] },
    { id: 'sa-h2', name: 'Astra Suites', stars: 4, type: 'Boutique Suite Hotel', neighborhood: 'Imerovigli', price: 420, image: '🌅', description: 'Perched at the highest point of the caldera rim in serene Imerovigli, Astra\'s 27 Cycladic suites blend natural rock architecture with modern elegance. The views of the famous caldera sunset are unparalleled.', amenities: ['Caldera View Pool', 'Cliff Spa', 'Breakfast Terrace', 'Concierge', 'Sunset Terrace', 'Wine Cellar'] },
    { id: 'sa-h3', name: 'Hotel Katikies Santorini', stars: 5, type: 'Luxury Cliffside Hotel', neighborhood: 'Oia', price: 890, image: '✨', description: 'Three tiered infinity pools cascading down the caldera cliff — Katikies is a masterpiece of whitewashed Cycladic architecture with some of Santorini\'s finest dining and the most photographed pool in Greece.', amenities: ['3 Infinity Pools', 'Signature Restaurant', 'Spa & Hammam', 'Caldera Views', 'Boat Excursions', 'Champagne Service'] }
  ],
  iceland: [
    { id: 'ic-h1', name: 'The Retreat at Blue Lagoon Iceland', stars: 5, type: 'Geothermal Spa Hotel', neighborhood: 'Grindavík Lava Fields', price: 1200, image: '💎', description: 'The world\'s most extraordinary spa hotel — built into a 800-year-old lava field with its own private section of the Blue Lagoon mineral waters, in-water suites, and the finest Nordic cuisine. Iceland personified.', amenities: ['Private Blue Lagoon Access', 'In-Water Relaxation Suite', 'LAVA Restaurant', 'Spa Rituals', 'Silica & Algae Treatments', 'Midnight Sun Viewing'] },
    { id: 'ic-h2', name: 'Ion Adventure Hotel', stars: 4, type: 'Design Adventure Hotel', neighborhood: 'Nesjavellir Geothermal Area', price: 380, image: '🌌', description: 'A striking modernist lodge perched above a geothermal power station between two national parks — panoramic Northern Lights viewing room, midnight sun photography decks, and direct access to hiking and lava fields.', amenities: ['Northern Lights Viewing Room', 'Hot Tubs', 'Adventure Desk', 'Lava Bar', 'Sauna', 'EV Charging'] },
    { id: 'ic-h3', name: '101 Hotel Reykjavik', stars: 4, type: 'Boutique Design Hotel', neighborhood: 'Central Reykjavik', price: 280, image: '🎭', description: 'The original boutique hotel of Reykjavik\'s 101 district — 38 individually designed rooms, an acclaimed restaurant, and the epicenter of Reykjavik\'s creative scene. Walk to the harbor, galleries, and nightlife.', amenities: ['In-House Restaurant & Bar', 'Nordic Design Rooms', 'City-Center Location', 'Concierge', 'Art Collection', 'Sauna'] }
  ],
  barcelona: [
    { id: 'bc-h1', name: 'Mandarin Oriental Barcelona', stars: 5, type: 'Luxury Hotel', neighborhood: 'Passeig de Gràcia', price: 620, image: '🌹', description: 'On Barcelona\'s most elegant boulevard — the Passeig de Gràcia — Mandarin Oriental occupies a converted 1950s bank with a rooftop pool overlooking Gaudí\'s La Pedrera. Michelin-starred dining by Carme Ruscalleda.', amenities: ['Rooftop Pool & Bar', 'Michelin-Starred Restaurant', 'Mandarin Spa', 'Gaudí Views', 'Luxury Boutiques', 'Concierge'] },
    { id: 'bc-h2', name: 'Casa Camper Barcelona', stars: 4, type: 'Design Boutique Hotel', neighborhood: 'El Raval', price: 265, image: '🎨', description: 'Born from the Camper footwear brand, this offbeat boutique hotel near Las Ramblas offers quirky design rooms, a 24-hour free snack bar, and rooftop hammocks — Barcelona\'s most playful place to stay.', amenities: ['24h Free Food & Drinks', 'Rooftop Terrace', 'Bicycles Included', 'Art & Design Rooms', 'El Raval Neighbourhood', 'Eco-Certified'] },
    { id: 'bc-h3', name: 'Hotel Arts Barcelona', stars: 5, type: 'Skyscraper Resort', neighborhood: 'Barceloneta Beach', price: 490, image: '🏖️', description: 'A 44-story icon rising from Barceloneta beach — Arts offers direct Mediterranean access, a Frank Gehry fish sculpture landmark, rooftop infinity pool, and two Michelin-starred restaurants by the sea.', amenities: ['Beachfront Location', 'Rooftop Infinity Pool', '2 Michelin-Starred Restaurants', 'Luxury Spa', 'Marina Views', 'Private Beach Club'] }
  ],
  maldives: [
    { id: 'mv-h1', name: 'Soneva Fushi', stars: 5, type: 'Private Island Resort', neighborhood: 'Baa Atoll (UNESCO Reserve)', price: 2800, image: '🌊', description: 'The original barefoot-luxury island resort — a UNESCO Biosphere Reserve with 63 private villas hidden in jungle, the world\'s finest open-air cinema, a chocolate room, and the clearest waters on earth.', amenities: ['Private Villa with Pool', 'Observatory', 'Chocolate & Ice Cream Room', 'SLOWLIFE Spa', 'House Reef Snorkeling', 'Seaplane Transfer'] },
    { id: 'mv-h2', name: 'Anantara Veli Maldives', stars: 5, type: 'Overwater Villa Resort', neighborhood: 'South Malé Atoll', price: 1100, image: '🏝️', description: 'A adults-only overwater paradise with villa decks suspended directly above electric blue lagoons — sunrise yoga, snorkeling with reef sharks, and couples dinners on the sandbank beneath the Milky Way.', amenities: ['Overwater Villas', 'Overwater Spa', 'Adults Only', 'Reef Snorkeling', 'Sandbank Dining', 'Speedboat Transfer'] },
    { id: 'mv-h3', name: 'COMO Cocoa Island', stars: 5, type: 'Dhoni-Shaped Boutique Resort', neighborhood: 'South Malé Atoll', price: 800, image: '🌺', description: 'Built on a dhoni-shaped private island of just 33 suites — COMO Cocoa is intimate, wellness-focused, and architecturally stunning. World-class diving, COMO Shambhala spa treatments, and exceptional Japanese-Maldivian fusion cuisine.', amenities: ['COMO Shambhala Spa', 'Scuba & Freediving', 'Water Sports', 'Japanese-Maldivian Restaurant', 'Yoga & Meditation', 'Speedboat Transfer'] }
  ],
  tokyo: [
    { id: 'tk-h1', name: 'The Peninsula Tokyo', stars: 5, type: 'Luxury City Hotel', neighborhood: 'Hibiya / Imperial Palace', price: 760, image: '🗼', description: 'Adjacent to the Imperial Palace gardens and overlooking the iconic Hibiya crossing — The Peninsula Tokyo is Japan\'s finest urban hotel, with rooms facing Mt. Fuji on clear days and a rooftop bar above the city.', amenities: ['Rooftop Bar & Pool', 'Peter Restaurant & Bar', 'The Peninsula Spa', 'Imperial Palace Views', 'Fleet of BMW 7-Series', 'Helicopter Tours'] },
    { id: 'tk-h2', name: 'Trunk Hotel', stars: 4, type: 'Lifestyle Boutique Hotel', neighborhood: 'Shibuya / Daikanyama', price: 380, image: '🎌', description: 'A locally-minded lifestyle hotel in hip Daikanyama — rooftop BBQ overlooking the Shibuya skyline, curated Tokyo retail, a natural wine bar, and 15 individually designed rooms celebrating Tokyo\'s creative subcultures.', amenities: ['Rooftop BBQ Terrace', 'Natural Wine Bar', 'Design Retail', 'Sauna', 'Bike Share', 'Local Neighbourhood Guide'] },
    { id: 'tk-h3', name: 'Park Hyatt Tokyo', stars: 5, type: 'Skyscraper Luxury Hotel', neighborhood: 'Shinjuku', price: 620, image: '✨', description: 'Occupying floors 39–52 of the Shinjuku Park Tower — immortalized in Lost in Translation — Park Hyatt Tokyo offers one of the world\'s great city views, a sky-high pool looking at Mt. Fuji, and the legendary New York Bar.', amenities: ['Sky-High Pool with Mt. Fuji Views', 'New York Bar (47th Floor)', 'Club On The Park Spa', 'The Peak Lounge', 'Tokyo Cityscape Views', '3 Signature Restaurants'] }
  ]
};

// ===== ITINERARY DATA =====
const itineraryData = {
  kyoto: {
    title: "Cultural Kyoto: A Timeless Journey",
    days: [
      {
        title: "Ancient Temples & First Impressions",
        morning: { title: "Fushimi Inari Shrine at Dawn", desc: "Arrive at Fushimi Inari before 7am to walk the 10,000 torii gates in near-solitude — one of Japan's most magical experiences without the crowds.", tags: ["culture", "hidden"] },
        afternoon: { title: "Gion District & Nishiki Market", desc: "Explore the historic geisha district of Gion, then dive into 'Kyoto's Kitchen' — Nishiki Market — tasting yuzu sweets, pickled plum, and fresh tofu.", tags: ["culture", "food"] },
        evening: { title: "Kaiseki Dinner in a Machiya", desc: "Experience kaiseki — Japan's exquisite multi-course ritual cuisine — in a 200-year-old wooden townhouse.", tags: ["food", "culture"] }
      },
      {
        title: "Zen Gardens & Hidden Kyoto",
        morning: { title: "Ryoan-ji Temple & Zen Meditation", desc: "Visit Ryoan-ji's iconic rock garden at opening time (8am) for undisturbed contemplation.", tags: ["culture", "relax"] },
        afternoon: { title: "Arashiyama Bamboo Grove & Monkey Park", desc: "Walk the otherworldly bamboo groves then cross the iconic Togetsukyo Bridge.", tags: ["nature", "hidden"] },
        evening: { title: "Sake Bar Crawl in Pontocho Alley", desc: "Wander the narrow lantern-lit lane of Pontocho and taste local sake paired with small plates.", tags: ["food", "culture"] }
      },
      {
        title: "Imperial History & Local Life",
        morning: { title: "Nijo Castle & Imperial Palace Gardens", desc: "Explore Nijo Castle's 'nightingale floors' and the meticulously maintained Imperial Palace grounds.", tags: ["culture"] },
        afternoon: { title: "Philosopher's Path & Nanzen-ji", desc: "Stroll the famous canal-lined Philosopher's Path, stopping at Nanzen-ji's grand aqueduct.", tags: ["nature", "hidden"] },
        evening: { title: "Kiyomizudera by Night", desc: "During special illumination seasons, Kiyomizudera's wooden stage is lit against the forest.", tags: ["culture", "food"] }
      },
      {
        title: "Day Trip: Nara & Sacred Deer",
        morning: { title: "Nara Park & Deer Encounter", desc: "Take the 45-minute train to Nara and spend the morning hand-feeding the 1,200 sacred deer.", tags: ["nature", "adventure"] },
        afternoon: { title: "Todai-ji Temple & Great Buddha", desc: "Stand before Japan's largest Buddha — 15 meters of bronze housed inside the world's largest wooden building.", tags: ["culture", "hidden"] },
        evening: { title: "Return to Kyoto: Teahouse Ceremony", desc: "Join an intimate tea ceremony at En tea house in the hills.", tags: ["culture", "relax"] }
      },
      {
        title: "Final Reflections & Secret Spots",
        morning: { title: "Kurama Mountain Hike", desc: "Take the scenic Eizan train to Kurama village and hike the cedar-forested mountain trail.", tags: ["nature", "adventure", "hidden"] },
        afternoon: { title: "Pottery Workshop in Kiyomizu", desc: "Join a 2-hour hands-on pottery class in Kyoto's famous Kiyomizuyaki ceramic tradition.", tags: ["culture"] },
        evening: { title: "Farewell: Rooftop Dinner with City Views", desc: "Toast to Kyoto from a rooftop restaurant in Shijo with a panoramic view over the city.", tags: ["food", "relax"] }
      }
    ]
  },
  bali: {
    title: "Soul of Bali: Healing & Harmony",
    days: [
      { title: "Arrival & Spiritual Awakening", morning: { title: "Sacred Tirta Empul Water Temple", desc: "Begin your Bali journey at the revered water temple of Tirta Empul — join the purification ritual in the holy spring.", tags: ["culture", "relax"] }, afternoon: { title: "Tegallalang Rice Terraces", desc: "Walk the emerald terraced rice paddies of Tegallalang in Ubud's highlands.", tags: ["nature"] }, evening: { title: "Kecak Fire Dance at Uluwatu", desc: "Watch the hypnotic Kecak dance performed at sunset on the clifftop Uluwatu Temple.", tags: ["culture"] } },
      { title: "Jungle & Wellness", morning: { title: "Sunrise Yoga in the Rice Fields", desc: "Join an open-air yoga session at dawn overlooking Ubud's rice fields.", tags: ["relax"] }, afternoon: { title: "Sacred Monkey Forest Sanctuary", desc: "Wander the ancient jungle temple complex of Ubud's Monkey Forest.", tags: ["nature", "culture"] }, evening: { title: "Traditional Balinese Massage & Spa", desc: "Indulge in a 2-hour traditional Balinese massage at a riverside spa.", tags: ["relax"] } },
      { title: "Coastline & Crystal Waters", morning: { title: "Snorkeling at Nusa Penida", desc: "Take a fast boat to Nusa Penida island and snorkel with manta rays at Manta Point.", tags: ["adventure", "nature"] }, afternoon: { title: "Kelingking Beach — the T-Rex Cliff", desc: "Hike down to the famous T-Rex shaped cliff and its pristine turquoise bay below.", tags: ["adventure", "nature"] }, evening: { title: "Seafood Dinner on Jimbaran Beach", desc: "Dine at sunset with your feet in the sand at a traditional Jimbaran seafood warung.", tags: ["food"] } },
      { title: "Mount Batur Volcano Trek", morning: { title: "Pre-Dawn Volcano Summit", desc: "Wake at 2am for a guided 2-hour hike to the summit of Mount Batur.", tags: ["adventure", "nature"] }, afternoon: { title: "Hot Spring Recovery Soak", desc: "Descend to the volcanic hot spring pools at the base of Batur.", tags: ["relax", "nature"] }, evening: { title: "Cooking Class: Balinese Cuisine", desc: "Join an evening cooking class at a family compound.", tags: ["food", "culture"] } },
      { title: "Art, Rice, & Farewell Sunset", morning: { title: "Campuhan Ridge Walk", desc: "Take the gentle 2km ridge walk above Ubud through swaying grass and jungle.", tags: ["nature", "hidden", "relax"] }, afternoon: { title: "Ubud Art Market & Galleries", desc: "Browse Ubud's vibrant art market for handcrafted batik, wood carvings, and silver jewelry.", tags: ["culture", "food"] }, evening: { title: "Farewell: Sunset at Tanah Lot Temple", desc: "Watch the sun melt into the ocean behind the iconic sea temple of Tanah Lot.", tags: ["culture", "relax"] } }
    ]
  },
  patagonia: {
    title: "Patagonia: Wild & Boundless",
    days: [
      { title: "Welcome to the Edge of the World", morning: { title: "Arrival in Puerto Natales", desc: "Arrive in the gateway town of Puerto Natales. Gear up at a local outfitter and taste your first Patagonian lamb empanada.", tags: ["food", "adventure"] }, afternoon: { title: "Milodon Cave Exploration", desc: "Visit the vast prehistoric cave where remains of the giant ground sloth were discovered.", tags: ["adventure", "nature", "hidden"] }, evening: { title: "Craft Beer & Gaucho Storytelling", desc: "Join a local asado at a traditional estancia and hear stories from a real Patagonian gaucho.", tags: ["food", "culture"] } },
      { title: "Torres del Paine: The Three Towers", morning: { title: "Sunrise Trek to Base Torres", desc: "The definitive Patagonia hike — a 9-hour roundtrip trail to the base of the three iconic granite towers.", tags: ["adventure", "nature"] }, afternoon: { title: "Mirador Las Torres", desc: "Reach the emerald glacial lake beneath the towers — one of the most dramatic mountain landscapes on earth.", tags: ["nature", "relax"] }, evening: { title: "Campfire Under the Milky Way", desc: "Sleep in a dome tent on the steppe and stargaze by a fire while wind howls past the nearby peaks.", tags: ["adventure", "nature"] } },
      { title: "Grey Glacier Ice Trek", morning: { title: "Catamaran to Grey Glacier", desc: "Board a catamaran across the turquoise Lake Grey through floating icebergs.", tags: ["adventure", "nature"] }, afternoon: { title: "Crampons Ice Walk on the Glacier", desc: "Strap on crampons and walk across the glacial surface with a guide.", tags: ["adventure", "nature"] }, evening: { title: "Whisky on the Rocks (Literally)", desc: "The boat serves whisky poured over ancient glacier ice chipped from Grey.", tags: ["relax", "hidden"] } },
      { title: "W Trek: French Valley", morning: { title: "Valle del Francés Hike", desc: "Trek into the hanging glaciers, waterfalls, and thousand-meter granite walls of French Valley.", tags: ["adventure", "nature"] }, afternoon: { title: "Summit Mirador Britanico", desc: "Push to the highest viewpoint in the W trek for a 360° panorama of glaciers, peaks, and lakes.", tags: ["adventure", "nature"] }, evening: { title: "Hot Spring Recovery at Paine Grande", desc: "Soothe your muscles in natural geothermal pools while the Cuernos del Paine glow.", tags: ["relax", "nature"] } },
      { title: "Condors & Farewell Steppe", morning: { title: "Kayaking on Lake Pehoé", desc: "Kayak the mirror-still morning surface of Pehoé Lake surrounded by snow-capped peaks.", tags: ["adventure", "nature"] }, afternoon: { title: "Wildlife Safari: Pumas & Guanacos", desc: "Drive the steppe at golden hour with a naturalist guide.", tags: ["adventure", "nature", "hidden"] }, evening: { title: "Final Feast: Whole Roasted Lamb", desc: "Celebrate with a traditional Patagonian asado — a whole lamb slow-roasted on a cross over open coals.", tags: ["food", "culture"] } }
    ]
  },
  santorini: {
    title: "Santorini: A Luxury Mediterranean Escape",
    days: [
      { title: "Arrival in Oia — Clifftop Dreams", morning: { title: "Private Caldera Villa Check-In", desc: "Settle into your clifftop suite with a private plunge pool overlooking the caldera.", tags: ["relax", "culture"] }, afternoon: { title: "Oia Village Exploration", desc: "Wander the iconic blue-domed churches and narrow white passages of Oia.", tags: ["culture", "food"] }, evening: { title: "The World-Famous Oia Sunset", desc: "Find your spot on the castle ramparts as the sun descends over the caldera.", tags: ["relax"] } },
      { title: "Ancient Akrotiri & Volcanic Beaches", morning: { title: "Akrotiri Archaeological Site", desc: "Explore the 'Pompeii of the Aegean' — a 3,600-year-old Minoan city preserved under volcanic ash.", tags: ["culture", "hidden"] }, afternoon: { title: "Red Beach & Black Sand Swimming", desc: "Swim at the dramatic Red Beach, formed by volcanic cliffs of crimson ash.", tags: ["nature", "relax"] }, evening: { title: "Seafood Dining on the Caldera Edge", desc: "Dine at a caldera-facing terrace restaurant in Imerovigli.", tags: ["food", "relax"] } },
      { title: "Wine & Volcanic Wonders", morning: { title: "Santo Wines Tasting at Sunrise", desc: "Visit Santo Wines winery at opening for a private early tasting.", tags: ["food", "hidden"] }, afternoon: { title: "Catamaran Cruise & Caldera Hot Springs", desc: "Set sail on a private catamaran around the volcanic caldera.", tags: ["adventure", "relax", "nature"] }, evening: { title: "Tasting Menu at a Michelin-Recognised Restaurant", desc: "An 8-course modern Greek tasting menu at a clifftop restaurant.", tags: ["food", "relax"] } },
      { title: "Fira to Oia Cliffside Walk", morning: { title: "The 10km Caldera Trail Hike", desc: "Walk the legendary trail from Fira to Oia along the caldera rim.", tags: ["adventure", "nature"] }, afternoon: { title: "Volcanic Island: Nea Kameni", desc: "Take a boat to the active volcanic island in the middle of the caldera.", tags: ["adventure", "nature", "hidden"] }, evening: { title: "Rooftop Cocktails in Imerovigli", desc: "Sip signature cocktails at a rooftop bar perched on the highest point of the caldera rim.", tags: ["relax", "food"] } },
      { title: "Pyrgos Village & Final Luxury", morning: { title: "Pyrgos Medieval Village at Dawn", desc: "Rise early and drive to the medieval hilltop village of Pyrgos — completely untouristy before 9am.", tags: ["culture", "hidden"] }, afternoon: { title: "Private Spa & Infinity Pool Day", desc: "Return to your villa for a private spa treatment, followed by a full afternoon in your infinity pool.", tags: ["relax"] }, evening: { title: "Farewell: Private Sunset Cruise", desc: "Board a private sunset sailing yacht for your final Santorini evening.", tags: ["relax", "food"] } }
    ]
  },
  iceland: {
    title: "Iceland: Solitude & Natural Wonder",
    days: [
      { title: "Reykjavik & First Wonders", morning: { title: "Hallgrímskirkja Church & City Walk", desc: "Start at the iconic church tower for panoramic views, then wander the colourful streets of Reykjavik's old town.", tags: ["culture"] }, afternoon: { title: "Golden Circle: Geysir & Gullfoss", desc: "Drive the legendary Golden Circle — watch Strokkur geyser erupt every 5 minutes.", tags: ["nature", "adventure"] }, evening: { title: "Geothermal Hot Pot Soak", desc: "Find a secret natural hot pot in the Hveragerði valley.", tags: ["relax", "hidden"] } },
      { title: "South Coast: Waterfalls & Black Sand", morning: { title: "Seljalandsfoss & Behind-the-Falls", desc: "Walk behind the 60m curtain of Seljalandsfoss waterfall.", tags: ["nature", "hidden"] }, afternoon: { title: "Reynisfjara Black Sand Beach", desc: "Stand on the most dramatic beach in Iceland — jet black volcanic sand and towering basalt columns.", tags: ["nature", "adventure"] }, evening: { title: "Northern Lights Hunt", desc: "Drive east away from light pollution and pull over wherever the sky ignites.", tags: ["nature", "hidden"] } },
      { title: "Glacier Walk & Ice Cave", morning: { title: "Sólheimajökull Glacier Trek", desc: "Strap on crampons and walk the surface of a living glacier with a guide.", tags: ["adventure", "nature"] }, afternoon: { title: "Blue Ice Cave at Vatnajökull", desc: "Enter a natural ice cave beneath Europe's largest glacier.", tags: ["adventure", "nature", "hidden"] }, evening: { title: "Lamb Soup by the Fire at a Farmhouse", desc: "End the day at a remote farmhouse guesthouse with a bowl of traditional Icelandic lamb soup.", tags: ["food", "relax"] } },
      { title: "East Fjords: Silence & Solitude", morning: { title: "Jökulsárlón Glacier Lagoon", desc: "Arrive at the glacial lagoon at sunrise — huge icebergs drift silently across the still water.", tags: ["nature", "relax"] }, afternoon: { title: "Diamond Beach", desc: "Walk to Diamond Beach where icebergs wash onto the black sand and glitter like scattered diamonds.", tags: ["nature", "hidden"] }, evening: { title: "Stargazing from a Remote Cabin", desc: "Stay in an isolated cabin in the East Fjords — no phone signal, no light pollution.", tags: ["relax", "nature"] } },
      { title: "Hot Rivers & Farewell", morning: { title: "Landmannalaugar Hot Springs Hike", desc: "Hike the rhyolite mountains of the Highlands — mountains striped in green, pink, yellow, and black.", tags: ["nature", "adventure"] }, afternoon: { title: "Reykjavik Food Hall & Skyr Tastings", desc: "Return to Reykjavik and explore the Hlemmur food hall.", tags: ["food"] }, evening: { title: "Final Soak: Reykjavik Sky Lagoon", desc: "Your farewell ritual: an hour at Sky Lagoon's infinity geothermal pool.", tags: ["relax"] } }
    ]
  }
};

// ===== HELPERS =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    state.currentPage = pageId;
    window.scrollTo(0, 0);
    updateNavbar(pageId);
  }
}

function updateNavbar(pageId) {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  navbar.className = 'navbar';
  if (pageId === 'page-home') {
    navbar.classList.add('transparent');
  } else if (['page-dashboard', 'page-quiz', 'page-destinations', 'page-flights', 'page-hotels', 'page-itinerary'].includes(pageId)) {
    navbar.classList.add('dark-mode');
  } else {
    navbar.classList.add('solid');
  }
  const navLinks = document.getElementById('nav-links');
  const navActions = document.getElementById('nav-actions');
  if (state.user) {
    navLinks.innerHTML = `
      <li><a onclick="showPage('page-home')" style="cursor:pointer">Home</a></li>
      <li><a onclick="showPage('page-dashboard')" style="cursor:pointer">Dashboard</a></li>
      <li><a onclick="showPage('page-about')" style="cursor:pointer">About</a></li>
      <li><a onclick="showPage('page-contact')" style="cursor:pointer">Contact</a></li>`;
    navActions.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <div class="user-avatar" style="width:36px;height:36px;font-size:0.9rem">${state.user.first_name.charAt(0).toUpperCase()}</div>
        <button onclick="logout()" class="btn btn-sm" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);padding:8px 16px">Sign Out</button>
      </div>`;
  } else {
    navLinks.innerHTML = `
      <li><a onclick="showPage('page-home')" style="cursor:pointer">Home</a></li>
      <li><a onclick="showPage('page-about')" style="cursor:pointer">About</a></li>
      <li><a onclick="showPage('page-contact')" style="cursor:pointer">Contact</a></li>`;
    navActions.innerHTML = `
      <a onclick="showAuthPage('login')" class="nav-login" style="cursor:pointer">Log In</a>
      <button onclick="showAuthPage('signup')" class="btn btn-primary btn-sm">Sign Up Free</button>`;
  }
}

function showAuthPage(tab = 'login') {
  showPage('page-auth');
  switchAuthTab(tab);
}

async function logout() {
  clearToken();
  state.user = null;
  state.quizAnswers = [];
  state.personalityType = null;
  state.selectedDestination = null;
  state.selectedFlight = null;
  state.selectedReturnFlight = null;
  state.selectedHotel = null;
  state.quizStep = 0;
  showPage('page-home');
  showToast('You have been signed out.', 'info');
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span> ${message}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Loading state helpers ────────────────────────────────────────────────────
function setButtonLoading(btn, loading, originalText) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait...' : originalText;
}

// ===== AUTH =====
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`form-${tab}`)?.classList.add('active');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;
  if (!email || !password) { showToast('Please fill in all fields.', 'info'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true, 'Sign In →');

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    state.user = data.user;
    await loadUserState();
    showPage('page-dashboard');
    updateDashboard();
    showToast(`Welcome back, ${data.user.first_name}!`);
  } catch (err) {
    showToast(err.message, 'info');
  } finally {
    setButtonLoading(btn, false, 'Sign In →');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const firstName = document.getElementById('signup-fname')?.value;
  const lastName = document.getElementById('signup-lname')?.value;
  const email = document.getElementById('signup-email')?.value;
  const password = document.getElementById('signup-password')?.value;

  if (!firstName || !email || !password) { showToast('Please fill in all required fields.', 'info'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters.', 'info'); return; }

  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true, 'Create Account — Free →');

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password })
    });
    setToken(data.token);
    state.user = data.user;
    showPage('page-dashboard');
    updateDashboard();
    showToast(`Welcome to Itinerate, ${firstName}! Let's find your perfect trip.`);
  } catch (err) {
    showToast(err.message, 'info');
  } finally {
    setButtonLoading(btn, false, 'Create Account — Free →');
  }
}

// ── Load persisted state (quiz + itineraries) after login ────────────────────
async function loadUserState() {
  if (!getToken()) return;
  try {
    // Load latest quiz result
    const quizData = await apiFetch('/itinerary/quiz/latest').catch(() => null);
    if (quizData) {
      state.personalityType = quizData.personalityType;
      state.quizAnswers = quizData.answers;
    }
    // Load saved itineraries
    const itinData = await apiFetch('/itinerary').catch(() => null);
    if (itinData && itinData.itineraries.length > 0) {
      // Pre-select the most recently updated one
      state.selectedDestination = itinData.itineraries[0].destinationId;
    }
  } catch (err) {
    // Silent fail — not critical
    console.warn('Could not load user state:', err);
  }
}

// ── Restore session from localStorage token on page load ─────────────────────
async function restoreSession() {
  const token = getToken();
  if (!token) return;
  try {
    const data = await apiFetch('/auth/me');
    state.user = data.user;
    await loadUserState();
    updateNavbar(state.currentPage);
  } catch (err) {
    // Token expired or invalid — clear it
    clearToken();
  }
}

// ===== DASHBOARD =====
function updateDashboard() {
  const el = document.getElementById('dash-user-name');
  if (el && state.user) el.textContent = state.user.first_name;

  const greeting = document.getElementById('dash-greeting');
  const hour = new Date().getHours();
  if (greeting) greeting.textContent = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Update progress steps
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((step, i) => {
    step.classList.remove('complete', 'active');
    if (i === 0) step.classList.add('complete');
    else if (i === 1 && state.personalityType) step.classList.add('complete');
    else if (i === 2 && state.selectedDestination) step.classList.add('complete');
    else if (i === 1 && !state.personalityType) step.classList.add('active');
    else if (i === 2 && state.personalityType && !state.selectedDestination) step.classList.add('active');
    else if (i === 3 && state.selectedDestination) step.classList.add('active');
  });

  // Update quiz card
  const quizStatus = document.getElementById('quiz-card-status');
  const quizCta = document.getElementById('quiz-card-cta');
  if (state.personalityType) {
    if (quizStatus) quizStatus.textContent = `Result: ${personalityTypes[state.personalityType]?.title}`;
    if (quizCta) { quizCta.textContent = 'Retake Quiz'; quizCta.className = 'btn btn-outline btn-sm'; }
  }

  // Update destinations card
  const destStatus = document.getElementById('dest-card-status');
  const destCta = document.getElementById('dest-card-cta');
  if (destStatus && destCta) {
    if (state.personalityType) {
      destStatus.className = 'status active';
      destStatus.textContent = `✓ Matched to ${personalityTypes[state.personalityType]?.title}`;
      destCta.className = 'btn btn-primary btn-sm';
    } else {
      destStatus.className = 'status locked';
      destStatus.textContent = '🔒 Complete quiz to unlock';
      destCta.className = 'btn btn-outline btn-sm';
    }
  }

  // Update itinerary card
  const itinStatus = document.getElementById('itin-card-status');
  const itinCta = document.getElementById('itin-card-cta');
  if (itinStatus && itinCta) {
    if (state.selectedHotel && state.selectedFlight) {
      itinStatus.className = 'status active';
      itinStatus.textContent = `✓ Flight & hotel selected`;
      itinCta.className = 'btn btn-primary btn-sm';
    } else if (state.selectedFlight) {
      itinStatus.className = 'status pending';
      itinStatus.textContent = `✈️ Flight chosen — pick a hotel`;
      itinCta.className = 'btn btn-primary btn-sm';
    } else if (state.selectedDestination) {
      itinStatus.className = 'status pending';
      itinStatus.textContent = `🗺️ Destination set — choose a flight`;
      itinCta.className = 'btn btn-primary btn-sm';
    } else if (state.personalityType) {
      itinStatus.className = 'status locked';
      itinStatus.textContent = '🔒 Choose a destination first';
      itinCta.className = 'btn btn-outline btn-sm';
    } else {
      itinStatus.className = 'status locked';
      itinStatus.textContent = '🔒 Complete quiz to unlock';
      itinCta.className = 'btn btn-outline btn-sm';
    }
  }

  // Update sidebar user
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarEmail = document.getElementById('sidebar-user-email');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (state.user) {
    if (sidebarName) sidebarName.textContent = `${state.user.first_name} ${state.user.last_name || ''}`.trim();
    if (sidebarEmail) sidebarEmail.textContent = state.user.email;
    if (sidebarAvatar) sidebarAvatar.textContent = state.user.first_name.charAt(0).toUpperCase();
  }
}

// ===== QUIZ =====
function startQuiz() {
  state.quizStep = 0;
  state.quizAnswers = [];
  showPage('page-quiz');
  renderQuizStep();
}

function renderQuizStep() {
  const step = state.quizStep;
  const total = quizQuestions.length;

  if (step >= total) {
    calculatePersonality();
    return;
  }

  const q = quizQuestions[step];
  const progress = ((step / total) * 100).toFixed(0);
  const letters = ['A', 'B', 'C'];

  document.getElementById('quiz-step-current').textContent = step + 1;
  document.getElementById('quiz-step-total').textContent = total;
  document.getElementById('quiz-category').textContent = q.category;
  document.getElementById('quiz-progress-fill').style.width = `${progress}%`;

  const container = document.getElementById('quiz-content');
  container.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-question-num">Question ${step + 1} of ${total}</div>
      <h2 class="quiz-question">${q.question}</h2>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" onclick="selectAnswer(${i})" data-index="${i}">
            <div class="option-letter">${letters[i]}</div>
            <span class="option-text">${opt.text}</span>
          </button>
        `).join('')}
      </div>
      <div class="quiz-actions">
        <button class="quiz-nav-btn back" onclick="quizBack()" ${step === 0 ? 'style="visibility:hidden"' : ''}>← Back</button>
        <button class="quiz-nav-btn next" id="quiz-next-btn" onclick="quizNext()" disabled>
          ${step === total - 1 ? 'See Results →' : 'Next →'}
        </button>
      </div>
    </div>`;

  if (state.quizAnswers[step] !== undefined) {
    const opts = container.querySelectorAll('.quiz-option');
    opts[state.quizAnswers[step].index]?.classList.add('selected');
    document.getElementById('quiz-next-btn').disabled = false;
  }
}

function selectAnswer(index) {
  const q = quizQuestions[state.quizStep];
  state.quizAnswers[state.quizStep] = { type: q.options[index].type, index };
  document.querySelectorAll('.quiz-option').forEach((opt, i) => opt.classList.toggle('selected', i === index));
  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) nextBtn.disabled = false;
  setTimeout(() => quizNext(), 400);
}

function quizNext() {
  if (state.quizAnswers[state.quizStep] === undefined) return;
  state.quizStep++;
  renderQuizStep();
}

function quizBack() {
  if (state.quizStep > 0) { state.quizStep--; renderQuizStep(); }
}

async function calculatePersonality() {
  const scores = {};
  state.quizAnswers.forEach(a => { if (a && a.type) scores[a.type] = (scores[a.type] || 0) + 1; });

  let dominant = 'cultural', maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; dominant = type; }
  }

  state.personalityType = dominant;
  const pt = personalityTypes[dominant];

  // Save to backend if logged in
  if (state.user && getToken()) {
    try {
      await apiFetch('/itinerary/quiz/save', {
        method: 'POST',
        body: JSON.stringify({ personalityType: dominant, answers: state.quizAnswers })
      });
    } catch (err) {
      console.warn('Could not save quiz result:', err.message);
    }
  }

  const container = document.getElementById('quiz-content');
  container.innerHTML = `
    <div class="quiz-card quiz-results">
      <div class="result-badge">${pt.emoji}</div>
      <div class="result-type">Your Travel Personality</div>
      <h2 class="result-title">${pt.title}</h2>
      <p class="result-description">${pt.description}</p>
      <div class="result-traits">
        ${pt.traits.map(t => `<span class="trait-badge">${t}</span>`).join('')}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" onclick="goToDestinations()">See My Destinations →</button>
        <button class="btn btn-outline btn-lg" onclick="startQuiz()">Retake Quiz</button>
      </div>
    </div>`;

  document.getElementById('quiz-progress-fill').style.width = '100%';
  document.getElementById('quiz-step-current').textContent = quizQuestions.length;

  if (state.user) updateDashboard();
  showToast(`You're a ${pt.title}! Let's find your perfect destination.`);
}

// ===== DESTINATIONS =====
function goToDestinations() {
  if (!state.personalityType) { showToast('Complete the quiz first!', 'info'); return; }
  showPage('page-destinations');
  renderDestinations();
}

function renderDestinations() {
  const pt = personalityTypes[state.personalityType];
  document.getElementById('dest-personality-emoji').textContent = pt.emoji;
  document.getElementById('dest-personality-type').textContent = pt.title;

  const matched = allDestinations.filter(d => d.types.includes(state.personalityType)).sort((a, b) => b.match - a.match);
  const others = allDestinations.filter(d => !d.types.includes(state.personalityType)).slice(0, Math.max(0, 4 - matched.length));
  const destinations = [...matched, ...others].slice(0, 4);

  const grid = document.getElementById('destinations-grid');
  grid.innerHTML = destinations.map(d => `
    <div class="destination-card" id="dest-card-${d.id}" onclick="selectDestination('${d.id}')">
      <div class="destination-img" style="background: ${d.gradient}">
        <div class="destination-emoji">${d.emoji}</div>
        <div class="destination-match">✦ ${d.match}% Match</div>
      </div>
      <div class="destination-body">
        <h3>${d.name}</h3>
        <p class="destination-country">📍 ${d.country}</p>
        <p>${d.description}</p>
        <div class="destination-tags">${d.tags.map(t => `<span class="destination-tag">${t}</span>`).join('')}</div>
        <div class="destination-meta"><span>🗓 ${d.duration}</span><span>💰 ${d.budget}</span></div>
        <button class="btn btn-primary" style="width:100%" onclick="event.stopPropagation();selectAndGoToItinerary('${d.id}')">Choose ${d.name} →</button>
      </div>
    </div>`).join('');
}

function selectDestination(id) {
  state.selectedDestination = id;
  document.querySelectorAll('.destination-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`dest-card-${id}`)?.classList.add('selected');
}

function selectAndGoToItinerary(id) {
  state.selectedDestination = id;
  state.selectedFlight = null;
  state.selectedReturnFlight = null;
  state.selectedHotel = null;
  if (state.user) updateDashboard();
  showPage('page-flights');
  renderFlights(id);
}

// ===== FLIGHTS =====
const _AIRPORT_FLAGS = {
  // North America
  JFK:'🇺🇸',LAX:'🇺🇸',ORD:'🇺🇸',ATL:'🇺🇸',DFW:'🇺🇸',SFO:'🇺🇸',MIA:'🇺🇸',
  SEA:'🇺🇸',BOS:'🇺🇸',LGA:'🇺🇸',EWR:'🇺🇸',DEN:'🇺🇸',IAH:'🇺🇸',PHX:'🇺🇸',
  MSP:'🇺🇸',DTW:'🇺🇸',PHL:'🇺🇸',CLT:'🇺🇸',LAS:'🇺🇸',MCO:'🇺🇸',
  YYZ:'🇨🇦',YVR:'🇨🇦',YUL:'🇨🇦',YYC:'🇨🇦',YEG:'🇨🇦',
  MEX:'🇲🇽',CUN:'🇲🇽',GDL:'🇲🇽',MTY:'🇲🇽',
  // Europe
  LHR:'🇬🇧',LGW:'🇬🇧',STN:'🇬🇧',MAN:'🇬🇧',EDI:'🇬🇧',BHX:'🇬🇧',
  CDG:'🇫🇷',ORY:'🇫🇷',NCE:'🇫🇷',LYS:'🇫🇷',MRS:'🇫🇷',
  FRA:'🇩🇪',MUC:'🇩🇪',DUS:'🇩🇪',BER:'🇩🇪',HAM:'🇩🇪',STR:'🇩🇪',
  FCO:'🇮🇹',MXP:'🇮🇹',VCE:'🇮🇹',NAP:'🇮🇹',LIN:'🇮🇹',
  MAD:'🇪🇸',BCN:'🇪🇸',AGP:'🇪🇸',PMI:'🇪🇸',VLC:'🇪🇸',
  AMS:'🇳🇱',BRU:'🇧🇪',ZRH:'🇨🇭',GVA:'🇨🇭',VIE:'🇦🇹',
  LIS:'🇵🇹',OPO:'🇵🇹',DUB:'🇮🇪',CPH:'🇩🇰',ARN:'🇸🇪',
  OSL:'🇳🇴',HEL:'🇫🇮',WAW:'🇵🇱',KRK:'🇵🇱',PRG:'🇨🇿',BUD:'🇭🇺',
  ATH:'🇬🇷',HER:'🇬🇷',SKG:'🇬🇷',IST:'🇹🇷',SAW:'🇹🇷',AYT:'🇹🇷',
  KEF:'🇮🇸',
  // Middle East & Africa
  DXB:'🇦🇪',AUH:'🇦🇪',DOH:'🇶🇦',AMM:'🇯🇴',BEY:'🇱🇧',CAI:'🇪🇬',
  CMN:'🇲🇦',RAK:'🇲🇦',NBO:'🇰🇪',JNB:'🇿🇦',CPT:'🇿🇦',ADD:'🇪🇹',
  // Asia & Pacific
  NRT:'🇯🇵',HND:'🇯🇵',KIX:'🇯🇵',CTS:'🇯🇵',FUK:'🇯🇵',OKA:'🇯🇵',
  ICN:'🇰🇷',GMP:'🇰🇷',PEK:'🇨🇳',PVG:'🇨🇳',CAN:'🇨🇳',CTU:'🇨🇳',
  HKG:'🇭🇰',TPE:'🇹🇼',SIN:'🇸🇬',KUL:'🇲🇾',CGK:'🇮🇩',DPS:'🇮🇩',
  BKK:'🇹🇭',HKT:'🇹🇭',CNX:'🇹🇭',SGN:'🇻🇳',HAN:'🇻🇳',MNL:'🇵🇭',
  DEL:'🇮🇳',BOM:'🇮🇳',BLR:'🇮🇳',MAA:'🇮🇳',CCU:'🇮🇳',HYD:'🇮🇳',
  CMB:'🇱🇰',DAC:'🇧🇩',KTM:'🇳🇵',
  SYD:'🇦🇺',MEL:'🇦🇺',BNE:'🇦🇺',PER:'🇦🇺',ADL:'🇦🇺',
  AKL:'🇳🇿',CHC:'🇳🇿',
  // South America
  GRU:'🇧🇷',GIG:'🇧🇷',BSB:'🇧🇷',
  SCL:'🇨🇱',BOG:'🇨🇴',LIM:'🇵🇪',EZE:'🇦🇷',
};

function _airportFlag(iata) {
  return _AIRPORT_FLAGS[iata?.toUpperCase()] || '';
}

function _formatFlightTime(raw) {
  if (!raw) return '—';
  // SerpAPI returns "YYYY-MM-DD HH:MM" — make it ISO-parseable
  const dt = new Date(raw.replace(' ', 'T'));
  if (isNaN(dt.getTime())) return raw;
  const date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

function _buildFlightCard(f, flightList, isReturn) {
  const listJson = JSON.stringify(flightList).replace(/"/g, '&quot;');
  const handler = isReturn ? `selectReturnFlight` : `selectFlight`;
  return `
    <div class="flight-card" id="flight-${f.id}" onclick="${handler}('${f.id}', ${listJson})">
      <div class="flight-card-top">
        <div class="flight-airline">
          <span class="flight-badge">${f.badge}</span>
          <div>
            <div class="flight-airline-name">${f.airline}</div>
            <div class="flight-number">${f.flightNumber}</div>
          </div>
        </div>
        <span class="flight-class-badge ${f.class.toLowerCase().includes('business') || f.class.toLowerCase().includes('first') ? 'premium' : ''}">${f.class}</span>
      </div>
      <div class="flight-route">
        <div class="flight-endpoint">
          <div class="flight-time">${_formatFlightTime(f.departure)}</div>
          <div class="flight-city">${_airportFlag(f.from)} ${f.from}</div>
        </div>
        <div class="flight-line-area">
          <div class="flight-duration">${f.duration}</div>
          <div class="flight-line"><span></span></div>
          <div class="flight-stops-label">${f.stops}</div>
        </div>
        <div class="flight-endpoint right">
          <div class="flight-time">${_formatFlightTime(f.arrival)}</div>
          <div class="flight-city">${_airportFlag(f.to)} ${f.to}</div>
        </div>
      </div>
      <div class="flight-perks">
        ${f.perks.map(p => `<span class="perk-tag">${p}</span>`).join('')}
      </div>
      <div class="flight-card-footer">
        <div class="flight-price-area">
          <div class="flight-price">$${f.price.toLocaleString()}</div>
          <div class="flight-price-label">per person</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();${handler}('${f.id}', ${listJson})">Select Flight →</button>
      </div>
    </div>`;
}

function _normalizeFlightData(f, i, idPrefix) {
  return {
    id: `${idPrefix}-${i}`,
    badge: f.badge || '✈️',
    airline: f.airline || 'Unknown',
    flightNumber: f.flight_number || f.flightNumber || '',
    from: f.origin || f.from || '',
    to: f.destination || f.to || '',
    departure: f.departure_time || f.departure || '',
    arrival: f.arrival_time || f.arrival || '',
    duration: f.duration || '',
    stops: f.stops || 'Nonstop',
    price: Number(f.price) || 0,
    class: f.class || 'Economy',
    perks: f.perks || []
  };
}

async function renderFlights(destId) {
  const dest = allDestinations.find(d => d.id === destId);
  if (!dest) return;
  const nameEl = document.getElementById('flights-dest-name');
  if (nameEl) nameEl.textContent = dest.name;

  const grid = document.getElementById('flights-grid');
  if (!grid) return;
  grid.innerHTML = `<div style="text-align:center;padding:60px;color:#94a3b8">Searching live flights...</div>`;

  const returnSection = document.getElementById('return-flights-section');
  if (returnSection) returnSection.style.display = 'none';

  let flights, returnFlights = [];
  try {
    const data = await apiFetch('/flights', {
      method: 'POST',
      body: JSON.stringify({ query: `Round-trip flights to ${dest.name} departing next month, returning after 7 days. Search both outbound and return legs.` })
    });
    if (data.flights && data.flights.length) {
      flights = data.flights.map((f, i) => _normalizeFlightData(f, i, 'live'));
    } else {
      flights = flightData[destId] || [];
    }
    if (data.return_flights && data.return_flights.length) {
      returnFlights = data.return_flights.map((f, i) => _normalizeFlightData(f, i, 'return'));
    }
  } catch (err) {
    flights = flightData[destId] || [];
  }

  grid.innerHTML = flights.map(f => _buildFlightCard(f, flights, false)).join('');

  if (returnSection) {
    const returnGrid = document.getElementById('return-flights-grid');
    if (returnFlights.length) {
      returnGrid.innerHTML = returnFlights.map(f => _buildFlightCard(f, returnFlights, true)).join('');
    } else {
      returnGrid.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8">No return flights found for this route.</div>`;
    }
    returnSection.style.display = 'block';
  }

  const continueBtn = document.getElementById('flights-continue-btn');
  if (continueBtn) continueBtn.disabled = !state.selectedFlight;
}


function selectFlight(id, flightList) {
  const flights = flightList || flightData[state.selectedDestination] || [];
  const flight = flights.find(f => f.id === id);
  if (!flight) return;
  state.selectedFlight = flight;
  document.querySelectorAll('#flights-grid .flight-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`flight-${id}`)?.classList.add('selected');
  const continueBtn = document.getElementById('flights-continue-btn');
  if (continueBtn) continueBtn.disabled = false;

  const returnSection = document.getElementById('return-flights-section');
  if (returnSection && returnSection.style.display !== 'none') {
    returnSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    setTimeout(() => {
      showPage('page-hotels');
      renderHotels(state.selectedDestination);
    }, 250);
  }
}

function selectReturnFlight(id, flightList) {
  const flight = flightList.find(f => f.id === id);
  if (!flight) return;
  state.selectedReturnFlight = flight;
  document.querySelectorAll('#return-flights-grid .flight-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`flight-${id}`)?.classList.add('selected');
  setTimeout(() => {
    showPage('page-hotels');
    renderHotels(state.selectedDestination);
  }, 250);
}


// ===== HOTELS =====
function renderHotels(destId) {
  const dest = allDestinations.find(d => d.id === destId);
  if (!dest) return;
  const nameEl = document.getElementById('hotels-dest-name');
  if (nameEl) nameEl.textContent = dest.name;

  const hotels = hotelData[destId] || [];
  const grid = document.getElementById('hotels-grid');
  if (!grid) return;

  grid.innerHTML = hotels.map(h => `
    <div class="hotel-card" id="hotel-${h.id}" onclick="selectHotel('${h.id}')">
      <div class="hotel-img-area">${h.image}</div>
      <div class="hotel-body">
        <div class="hotel-card-top">
          <span class="hotel-type-badge">${h.type}</span>
          <div class="hotel-price-area">
            <span class="hotel-price">$${h.price.toLocaleString()}</span>
            <span class="hotel-price-label">/night</span>
          </div>
        </div>
        <h3 class="hotel-name">${h.name}</h3>
        <div class="hotel-stars">${'★'.repeat(h.stars)}${'☆'.repeat(5 - h.stars)}</div>
        <div class="hotel-neighborhood">📍 ${h.neighborhood}</div>
        <p class="hotel-description">${h.description}</p>
        <div class="hotel-amenities">
          ${h.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:20px" onclick="event.stopPropagation();selectHotel('${h.id}')">
          Select This Hotel →
        </button>
      </div>
    </div>`).join('');

  const continueBtn = document.getElementById('hotels-continue-btn');
  if (continueBtn) continueBtn.disabled = !state.selectedHotel;
  if (state.selectedHotel) {
    document.getElementById(`hotel-${state.selectedHotel.id}`)?.classList.add('selected');
  }
}

function selectHotel(id) {
  const hotels = hotelData[state.selectedDestination] || [];
  const hotel = hotels.find(h => h.id === id);
  if (!hotel) return;
  state.selectedHotel = hotel;
  document.querySelectorAll('.hotel-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`hotel-${id}`)?.classList.add('selected');
  const continueBtn = document.getElementById('hotels-continue-btn');
  if (continueBtn) continueBtn.disabled = false;
  setTimeout(() => {
    if (state.user) updateDashboard();
    showPage('page-itinerary');
    renderItinerary(state.selectedDestination);
  }, 250);
}

function goToFlights() {
  showPage('page-flights');
  renderFlights(state.selectedDestination);
}

function goToHotels() {
  if (!state.selectedFlight) { showToast('Please select a flight first.', 'info'); return; }
  showPage('page-hotels');
  renderHotels(state.selectedDestination);
}

function goToItineraryFromHotels() {
  if (!state.selectedHotel) { showToast('Please select a hotel first.', 'info'); return; }
  if (state.user) updateDashboard();
  showPage('page-itinerary');
  renderItinerary(state.selectedDestination);
}

// ===== ITINERARY =====
function renderItinerary(destId) {
  const dest = allDestinations.find(d => d.id === destId);
  const itin = itineraryData[destId] || itineraryData['kyoto'];
  const pt = personalityTypes[state.personalityType || 'cultural'];
  if (!dest || !itin) return;

  document.getElementById('itin-emoji').textContent = dest.emoji;
  document.getElementById('itin-title').textContent = itin.title;
  document.getElementById('itin-subtitle').textContent = `A ${pt.title} itinerary for ${dest.name}, ${dest.country}`;
  document.getElementById('itin-personality').textContent = `${pt.emoji} ${pt.title}`;

  updateTripSummaryBar();

  const container = document.getElementById('itinerary-days');
  const timeIcons = { morning: '🌅', afternoon: '☀️', evening: '🌙' };

  container.innerHTML = itin.days.map((day, i) => `
    <div class="day-card">
      <div class="day-header">
        <div><div class="day-number">Day ${i + 1}</div><div class="day-title">${day.title}</div></div>
        <div class="day-date">📅 Day ${i + 1} of 5</div>
      </div>
      <div class="day-activities">
        ${['morning', 'afternoon', 'evening'].map(time => {
          const act = day[time];
          if (!act) return '';
          return `<div class="time-block">
            <div class="time-label">
              <div class="time-icon ${time}">${timeIcons[time]}</div>
              <div class="time-text">${time.charAt(0).toUpperCase() + time.slice(1)}</div>
            </div>
            <div class="activity-content">
              <h4>${act.title}</h4><p>${act.desc}</p>
              <div class="activity-tags">${(act.tags || []).map(tag => `<span class="activity-tag ${tag}">${tag.charAt(0).toUpperCase() + tag.slice(1)}</span>`).join('')}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function updateTripSummaryBar() {
  const bar = document.getElementById('trip-summary-bar');
  if (!bar) return;
  if (!state.selectedFlight && !state.selectedHotel) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const f = state.selectedFlight;
  const r = state.selectedReturnFlight;
  const h = state.selectedHotel;
  const totalEstimate = (f ? f.price : 0) + (r ? r.price : 0) + (h ? h.price * 5 : 0);
  bar.innerHTML = `
    <div class="summary-pill">
      <span class="pill-icon">✈️</span>
      <div>
        <div class="pill-label">Outbound Flight</div>
        <div class="pill-value">${f ? `${f.airline} · ${f.flightNumber}` : '—'}</div>
        <div class="pill-detail">${f ? `${f.from} → ${f.to} · ${f.stops} · ${f.class}` : ''}</div>
      </div>
      <div class="pill-price">${f ? `$${f.price.toLocaleString()}` : ''}</div>
    </div>
    ${r ? `
    <div class="summary-pill">
      <span class="pill-icon">✈️</span>
      <div>
        <div class="pill-label">Return Flight</div>
        <div class="pill-value">${r.airline} · ${r.flightNumber}</div>
        <div class="pill-detail">${r.from} → ${r.to} · ${r.stops} · ${r.class}</div>
      </div>
      <div class="pill-price">$${r.price.toLocaleString()}</div>
    </div>` : ''}
    <div class="summary-pill">
      <span class="pill-icon">🏨</span>
      <div>
        <div class="pill-label">Hotel</div>
        <div class="pill-value">${h ? h.name : '—'}</div>
        <div class="pill-detail">${h ? `${'★'.repeat(h.stars)} · ${h.neighborhood}` : ''}</div>
      </div>
      <div class="pill-price">${h ? `<span>$${h.price.toLocaleString()}</span><span class="pill-price-label">/night</span>` : ''}</div>
    </div>
    <div class="summary-pill total">
      <span class="pill-icon">💰</span>
      <div>
        <div class="pill-label">Est. Total</div>
        <div class="pill-value">$${totalEstimate.toLocaleString()}</div>
        <div class="pill-detail">${r ? 'Outbound + return' : 'Flight'} + 5 nights hotel</div>
      </div>
    </div>`;
}

async function saveItinerary() {
  if (!state.user || !getToken()) {
    showToast('Please log in to save your itinerary.', 'info');
    showAuthPage('login');
    return;
  }
  if (!state.selectedDestination) {
    showToast('No destination selected.', 'info');
    return;
  }

  const dest = allDestinations.find(d => d.id === state.selectedDestination);
  const itin = itineraryData[state.selectedDestination];
  if (!dest || !itin) return;

  try {
    await apiFetch('/itinerary', {
      method: 'POST',
      body: JSON.stringify({
        destinationId: dest.id,
        destinationName: dest.name,
        personalityType: state.personalityType,
        itinerary: itin,
        flight: state.selectedFlight || null,
        returnFlight: state.selectedReturnFlight || null,
        hotel: state.selectedHotel || null
      })
    });
    state.savedItinerary = true;
    showToast(`${dest.name} itinerary saved to your account! ✓`);
    if (state.user) updateDashboard();
  } catch (err) {
    showToast(`Could not save: ${err.message}`, 'info');
  }
}

// ── Iti Live Chatbot Helper ──────────────────────────────────────────────────
// Call this function from your existing "Iti" chatbot code on the contact page!
async function getItiLiveResponse(userMessage) {
  try {
    const data = await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ message: userMessage })
    });
    
    if (data && data.reply) {
      // Format markdown (bold and line breaks) into HTML for your chat UI
      const safeText = data.reply.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return safeText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
    }
    return "I'm not sure how to respond to that.";
  } catch (err) {
    console.error("Iti Chatbot Error:", err);
    return "Sorry, I am having trouble connecting to the server.";
  }
}

function handleScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  if (state.currentPage === 'page-home') {
    if (window.scrollY > 80) { navbar.classList.remove('transparent'); navbar.classList.add('solid'); }
    else { navbar.classList.remove('solid'); navbar.classList.add('transparent'); }
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Restore session from token in localStorage
  await restoreSession();
  showPage('page-home');
  window.addEventListener('scroll', handleScroll);

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  document.getElementById('form-login')?.addEventListener('submit', handleLogin);
  document.getElementById('form-signup')?.addEventListener('submit', handleSignup);
  
  animateCounters();
});

function animateCounters() {
  const counters = document.querySelectorAll('.hero-stat .number');
  counters.forEach(counter => {
    const target = counter.getAttribute('data-target');
    if (!target) return;
    let current = 0;
    const end = parseInt(target);
    const suffix = target.includes('k') ? 'k+' : '+';
    const step = Math.ceil(end / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= end) { current = end; clearInterval(timer); }
      counter.textContent = current + suffix;
    }, 40);
  });
}