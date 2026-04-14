/* ===== ITINERATE APP ===== */

// ===== STATE =====
const state = {
  currentPage: 'home',
  user: null,
  quizStep: 0,
  quizAnswers: [],
  personalityType: null,
  selectedDestination: null,
  savedItinerary: false
};

// ===== API =====
const API_BASE = 'http://localhost:8000/api';

let auth0Client = null;

// TODO: Replace these with your Auth0 Application details
const AUTH0_DOMAIN = 'dev-607ub60d6546cto0.us.auth0.com';
const AUTH0_CLIENT_ID = 'pUkC3pu7otzLwkZcLtFvMXfRCNoI9fG1';
const AUTH0_AUDIENCE = 'https://api.itinerate.com/'; // Make sure this perfectly matches your Auth0 dashboard!

async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  let token = null;
  
  if (auth0Client && await auth0Client.isAuthenticated()) {
    token = await auth0Client.getTokenSilently();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res;
}

async function checkSession() {
  // 1. Prevent silent failures if you accidentally opened the file directly
  if (window.location.protocol === 'file:') {
    console.error("Auth0 requires a local server. You are running on file://");
    showToast("Error: You must run a local server (localhost) for login to work!", "info");
    return;
  }

  try {
    auth0Client = await auth0.createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        audience: AUTH0_AUDIENCE,
        redirect_uri: window.location.origin
      },
      cacheLocation: 'localstorage'
    });
  } catch (e) {
    console.error("Auth0 initialization error:", e);
    return;
  }

  // Check if returning from the Auth0 login redirect
  const search = window.location.search;
  
  // 2. Catch instant bounce-back errors from Auth0
  if (search.includes('error=')) {
    const params = new URLSearchParams(search);
    showToast(`Auth0 Error: ${params.get('error_description') || params.get('error')}`, 'info');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (search.includes('state=')) {
    if (search.includes('code=')) {
      try {
        await auth0Client.handleRedirectCallback();
      } catch (e) {
        console.error("Auth0 callback error:", e);
      }
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (isAuthenticated) {
      const user = await auth0Client.getUser();
      state.user = { 
        id: user?.sub, 
        name: user?.name || user?.nickname || user?.email || 'Traveler', 
        email: user?.email 
      };
      updateDashboard();
      
      // Pings our backend to ensure the Django DB creates/updates our user record 
      try {
        await apiFetch('/me/');
      } catch (e) {
        console.warn("Backend not reachable, but user is logged in locally.");
      }
    }
  } catch (e) {
    console.error("Auth0 check failed:", e);
  }
}

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
    duration: "5–7 days",
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
    duration: "7–10 days",
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
    duration: "10–14 days",
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
    duration: "5–7 days",
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
    duration: "7–10 days",
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
    duration: "5–7 days",
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
    duration: "7–10 days",
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
    duration: "7–10 days",
    budget: "$$",
    match: 98
  }
];

// ===== ITINERARY DATA =====
const itineraryData = {
  kyoto: {
    title: "Cultural Kyoto: A Timeless Journey",
    days: [
      {
        title: "Ancient Temples & First Impressions",
        morning: {
          title: "Fushimi Inari Shrine at Dawn",
          desc: "Arrive at Fushimi Inari before 7am to walk the 10,000 torii gates in near-solitude — one of Japan's most magical experiences without the crowds.",
          tags: ["culture", "hidden"]
        },
        afternoon: {
          title: "Gion District & Nishiki Market",
          desc: "Explore the historic geisha district of Gion, then dive into 'Kyoto's Kitchen' — Nishiki Market — tasting yuzu sweets, pickled plum, and fresh tofu.",
          tags: ["culture", "food"]
        },
        evening: {
          title: "Kaiseki Dinner in a Machiya",
          desc: "Experience kaiseki — Japan's exquisite multi-course ritual cuisine — in a 200-year-old wooden townhouse. Reserve at Nakamura or Hyotei for a meal you'll talk about forever.",
          tags: ["food", "culture"]
        }
      },
      {
        title: "Zen Gardens & Hidden Kyoto",
        morning: {
          title: "Ryoan-ji Temple & Zen Meditation",
          desc: "Visit Ryoan-ji's iconic rock garden at opening time (8am) for undisturbed contemplation. Join an optional 30-minute guided zazen session in the temple hall.",
          tags: ["culture", "relax"]
        },
        afternoon: {
          title: "Arashiyama Bamboo Grove & Monkey Park",
          desc: "Walk the otherworldly bamboo groves then cross the iconic Togetsukyo Bridge. Venture up to Iwatayama Monkey Park for panoramic city views and surprisingly friendly macaques.",
          tags: ["nature", "hidden"]
        },
        evening: {
          title: "Sake Bar Crawl in Pontocho Alley",
          desc: "Wander the narrow lantern-lit lane of Pontocho — one of Kyoto's most atmospheric alleyways — and taste local sake paired with small plates at intimate izakayas.",
          tags: ["food", "culture"]
        }
      },
      {
        title: "Imperial History & Local Life",
        morning: {
          title: "Nijo Castle & Imperial Palace Gardens",
          desc: "Explore Nijo Castle's 'nightingale floors' (designed to squeak under intruders) and the meticulously maintained Imperial Palace grounds — a living history lesson.",
          tags: ["culture"]
        },
        afternoon: {
          title: "Philosopher's Path & Nanzen-ji",
          desc: "Stroll the famous canal-lined Philosopher's Path, stopping at Nanzen-ji's grand aqueduct and hidden sub-temples that most visitors walk past.",
          tags: ["nature", "hidden"]
        },
        evening: {
          title: "Kiyomizudera by Night",
          desc: "During special illumination seasons, Kiyomizudera's wooden stage is lit against the forest — a breathtaking sight. End the evening with matcha soft serve on Sannen-zaka slope.",
          tags: ["culture", "food"]
        }
      },
      {
        title: "Day Trip: Nara & Sacred Deer",
        morning: {
          title: "Nara Park & Deer Encounter",
          desc: "Take the 45-minute train to Nara and spend the morning hand-feeding the 1,200 sacred deer that freely roam the park — one of the world's most surreal wildlife experiences.",
          tags: ["nature", "adventure"]
        },
        afternoon: {
          title: "Todai-ji Temple & Great Buddha",
          desc: "Stand before Japan's largest Buddha — 15 meters of bronze housed inside the world's largest wooden building. Then explore the forested Kasuga-taisha shrine.",
          tags: ["culture", "hidden"]
        },
        evening: {
          title: "Return to Kyoto: Teahouse Ceremony",
          desc: "Back in Kyoto, join an intimate tea ceremony at En tea house in the hills — a meditative ritual of matcha, wagashi sweets, and pure presence.",
          tags: ["culture", "relax"]
        }
      },
      {
        title: "Final Reflections & Secret Spots",
        morning: {
          title: "Kurama Mountain Hike",
          desc: "Take the scenic Eizan train to Kurama village and hike the cedar-forested mountain trail to Kurama-dera temple — one of Kyoto's most spiritual and least-visited spots.",
          tags: ["nature", "adventure", "hidden"]
        },
        afternoon: {
          title: "Pottery Workshop in Kiyomizu",
          desc: "Join a 2-hour hands-on pottery class in Kyoto's famous Kiyomizuyaki ceramic tradition — take home a piece you made yourself.",
          tags: ["culture"]
        },
        evening: {
          title: "Farewell: Rooftop Dinner with City Views",
          desc: "Toast to Kyoto from a rooftop restaurant in Shijo with a panoramic view over the city and a final taste of Kyoto's celebrated tofu cuisine.",
          tags: ["food", "relax"]
        }
      }
    ]
  },
  bali: {
    title: "Soul of Bali: Healing & Harmony",
    days: [
      {
        title: "Arrival & Spiritual Awakening",
        morning: {
          title: "Sacred Tirta Empul Water Temple",
          desc: "Begin your Bali journey at the revered water temple of Tirta Empul — join the purification ritual in the holy spring used for over 1,000 years.",
          tags: ["culture", "relax"]
        },
        afternoon: {
          title: "Tegallalang Rice Terraces",
          desc: "Walk the emerald terraced rice paddies of Tegallalang in Ubud's highlands — one of the most photographed and beloved landscapes in all of Southeast Asia.",
          tags: ["nature"]
        },
        evening: {
          title: "Kecak Fire Dance at Uluwatu",
          desc: "Watch the hypnotic Kecak dance performed at sunset on the clifftop Uluwatu Temple — 70 performers chanting in firelight as the sun sinks into the Indian Ocean.",
          tags: ["culture"]
        }
      },
      {
        title: "Jungle & Wellness",
        morning: {
          title: "Sunrise Yoga in the Rice Fields",
          desc: "Join an open-air yoga session at dawn overlooking Ubud's rice fields — a defining Bali ritual that connects body and landscape in a way nothing else does.",
          tags: ["relax"]
        },
        afternoon: {
          title: "Sacred Monkey Forest Sanctuary",
          desc: "Wander the ancient jungle temple complex of Ubud's Monkey Forest, home to 700 Balinese long-tailed macaques living among moss-draped shrines.",
          tags: ["nature", "culture"]
        },
        evening: {
          title: "Traditional Balinese Massage & Spa",
          desc: "Indulge in a 2-hour traditional Balinese massage at a riverside spa — deep-tissue technique using coconut oil and frangipani. Pure restoration.",
          tags: ["relax"]
        }
      },
      {
        title: "Coastline & Crystal Waters",
        morning: {
          title: "Snorkeling at Nusa Penida",
          desc: "Take a fast boat to Nusa Penida island and snorkel with manta rays at Manta Point — a genuinely humbling underwater encounter with giants of the sea.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Kelingking Beach — the T-Rex Cliff",
          desc: "Hike down to the famous T-Rex shaped cliff and its pristine turquoise bay below — one of the most dramatic and beautiful beaches in the world.",
          tags: ["adventure", "nature"]
        },
        evening: {
          title: "Seafood Dinner on Jimbaran Beach",
          desc: "Dine at sunset with your feet in the sand at a traditional Jimbaran seafood warung — grilled fish, prawns, and squid, served fresh from the morning boats.",
          tags: ["food"]
        }
      },
      {
        title: "Mount Batur Volcano Trek",
        morning: {
          title: "Pre-Dawn Volcano Summit",
          desc: "Wake at 2am for a guided 2-hour hike to the summit of Mount Batur — arriving at the caldera rim just as the sun rises over the volcano in a sea of pink and gold clouds.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Hot Spring Recovery Soak",
          desc: "Descend to the volcanic hot spring pools at the base of Batur — soak your muscles while looking up at the crater you just conquered. Hard-earned bliss.",
          tags: ["relax", "nature"]
        },
        evening: {
          title: "Cooking Class: Balinese Cuisine",
          desc: "Join an evening cooking class at a family compound — learn to make bumbu Bali spice paste, sate lilit, and black rice pudding from scratch.",
          tags: ["food", "culture"]
        }
      },
      {
        title: "Art, Rice, & Farewell Sunset",
        morning: {
          title: "Campuhan Ridge Walk",
          desc: "Take the gentle 2km ridge walk above Ubud through swaying grass and jungle — completely free, no tourists, just birdsong and a sense of floating above the world.",
          tags: ["nature", "hidden", "relax"]
        },
        afternoon: {
          title: "Ubud Art Market & Galleries",
          desc: "Browse Ubud's vibrant art market for handcrafted batik, wood carvings, and silver jewelry, then visit the ARMA Museum for the finest collection of Balinese art.",
          tags: ["culture", "food"]
        },
        evening: {
          title: "Farewell: Sunset at Tanah Lot Temple",
          desc: "Watch the sun melt into the ocean behind the iconic sea temple of Tanah Lot — Bali's most photographed sunset, and one that never disappoints.",
          tags: ["culture", "relax"]
        }
      }
    ]
  },
  patagonia: {
    title: "Patagonia: Wild & Boundless",
    days: [
      {
        title: "Welcome to the Edge of the World",
        morning: {
          title: "Arrival in Puerto Natales",
          desc: "Arrive in the gateway town of Puerto Natales. Gear up at a local outfitter, meet your guide, and taste your first Patagonian lamb empanada from a street stall.",
          tags: ["food", "adventure"]
        },
        afternoon: {
          title: "Milodon Cave Exploration",
          desc: "Visit the vast prehistoric cave where remains of the giant ground sloth were discovered. Hike the surrounding steppe with condors circling overhead.",
          tags: ["adventure", "nature", "hidden"]
        },
        evening: {
          title: "Craft Beer & Gaucho Storytelling",
          desc: "Join a local asado (barbecue) at a traditional estancia, hear stories from a real Patagonian gaucho, and pair your lamb chop with a Patagonian craft beer.",
          tags: ["food", "culture"]
        }
      },
      {
        title: "Torres del Paine: The Three Towers",
        morning: {
          title: "Sunrise Trek to Base Torres",
          desc: "The definitive Patagonia hike — a 9-hour roundtrip trail to the base of the three iconic granite towers. Start at 5:30am for the golden light on the peaks.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Mirador Las Torres",
          desc: "Reach the emerald glacial lake beneath the towers — one of the most dramatic mountain landscapes on earth. Eat your packed lunch while the granite giants loom overhead.",
          tags: ["nature", "relax"]
        },
        evening: {
          title: "Campfire Under the Milky Way",
          desc: "Patagonia has near-zero light pollution. Sleep in a dome tent on the steppe and stargaze by a fire while wind howls past the nearby peaks.",
          tags: ["adventure", "nature"]
        }
      },
      {
        title: "Grey Glacier Ice Trek",
        morning: {
          title: "Catamaran to Grey Glacier",
          desc: "Board a catamaran across the turquoise Lake Grey through floating icebergs to reach the face of the Grey Glacier — a 6km-wide wall of ancient blue ice.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Crampons Ice Walk on the Glacier",
          desc: "Strap on crampons and walk across the glacial surface with a guide — exploring ice caves, seracs, and crevasses of 12,000-year-old Patagonian ice.",
          tags: ["adventure", "nature"]
        },
        evening: {
          title: "Whisky on the Rocks (Literally)",
          desc: "The boat serves whisky poured over ancient glacier ice chipped from Grey. Sip it while drifting back across the lake at sunset — possibly the best drink of your life.",
          tags: ["relax", "hidden"]
        }
      },
      {
        title: "W Trek: French Valley",
        morning: {
          title: "Valle del Francés Hike",
          desc: "Trek into the hanging glaciers, waterfalls, and thousand-meter granite walls of French Valley — arguably the most dramatic valley in all of Patagonia.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Summit Mirador Britanico",
          desc: "Push to the highest viewpoint in the W trek for a 360° panorama of glaciers, peaks, and lakes that stretches to the horizon in every direction.",
          tags: ["adventure", "nature"]
        },
        evening: {
          title: "Hot Spring Recovery at Paine Grande",
          desc: "Soothe your muscles in natural geothermal pools while the Cuernos del Paine — the 'Horns of Paine' — glow in the long Patagonian twilight.",
          tags: ["relax", "nature"]
        }
      },
      {
        title: "Condors & Farewell Steppe",
        morning: {
          title: "Kayaking on Lake Pehoé",
          desc: "Kayak the mirror-still morning surface of Pehoé Lake surrounded by snow-capped peaks and a sky full of Andean condors riding thermals overhead.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Wildlife Safari: Pumas & Guanacos",
          desc: "Drive the steppe at golden hour with a naturalist guide — this is prime time to spot Patagonian pumas, guanacos, rheas, and foxes in their natural habitat.",
          tags: ["adventure", "nature", "hidden"]
        },
        evening: {
          title: "Final Feast: Whole Roasted Lamb",
          desc: "Celebrate with a traditional Patagonian asado — a whole lamb slow-roasted on a cross over open coals for 4 hours. Pair with a Malbec and a sky full of stars.",
          tags: ["food", "culture"]
        }
      }
    ]
  },
  santorini: {
    title: "Santorini: A Luxury Mediterranean Escape",
    days: [
      {
        title: "Arrival in Oia — Clifftop Dreams",
        morning: {
          title: "Private Caldera Villa Check-In",
          desc: "Settle into your clifftop suite with a private plunge pool overlooking the caldera — wake up to nothing but sky, sea, and the distant rim of a sleeping volcano.",
          tags: ["relax", "culture"]
        },
        afternoon: {
          title: "Oia Village Exploration",
          desc: "Wander the iconic blue-domed churches and narrow white passages of Oia — stop for fresh loukoumades (honey donuts) and explore boutique galleries hidden in cave homes.",
          tags: ["culture", "food"]
        },
        evening: {
          title: "The World-Famous Oia Sunset",
          desc: "Find your spot on the castle ramparts as the sun descends over the caldera in a cascade of amber and violet — a sunset that has made Santorini immortal.",
          tags: ["relax"]
        }
      },
      {
        title: "Ancient Akrotiri & Volcanic Beaches",
        morning: {
          title: "Akrotiri Archaeological Site",
          desc: "Explore the 'Pompeii of the Aegean' — a 3,600-year-old Minoan city preserved under volcanic ash. The frescoes here predate classical Greece by over 1,000 years.",
          tags: ["culture", "hidden"]
        },
        afternoon: {
          title: "Red Beach & Black Sand Swimming",
          desc: "Swim at the dramatic Red Beach, formed by volcanic cliffs of crimson ash, then walk to the jet-black Perissa beach — a geologic spectacle doubled as a beach day.",
          tags: ["nature", "relax"]
        },
        evening: {
          title: "Seafood Dining on the Caldera Edge",
          desc: "Dine at a caldera-facing terrace restaurant in Imerovigli — grilled octopus, sea bass carpaccio, and a bottle of crisp Assyrtiko from Santorini's volcanic vineyards.",
          tags: ["food", "relax"]
        }
      },
      {
        title: "Wine & Volcanic Wonders",
        morning: {
          title: "Santo Wines Tasting at Sunrise",
          desc: "Visit Santo Wines winery at opening for a private early tasting — Santorini's volcanic soil produces some of the world's most distinctive Assyrtiko white wines.",
          tags: ["food", "hidden"]
        },
        afternoon: {
          title: "Catamaran Cruise & Caldera Hot Springs",
          desc: "Set sail on a private catamaran around the volcanic caldera — swim in the natural geothermal hot springs, snorkel over ancient lava fields, and sunbathe on deck.",
          tags: ["adventure", "relax", "nature"]
        },
        evening: {
          title: "Tasting Menu at a Michelin-Recognised Restaurant",
          desc: "An 8-course modern Greek tasting menu at a clifftop restaurant — each course paired with a local wine and served to the sound of the Aegean far below.",
          tags: ["food", "relax"]
        }
      },
      {
        title: "Fira to Oia Cliffside Walk",
        morning: {
          title: "The 10km Caldera Trail Hike",
          desc: "Walk the legendary trail from Fira to Oia along the caldera rim — dramatic views at every step, passing ancient windmills, vineyards, and hidden churches.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Volcanic Island: Nea Kameni",
          desc: "Take a boat to the active volcanic island in the middle of the caldera, hike to the crater rim, and look down into the earth that created this entire archipelago.",
          tags: ["adventure", "nature", "hidden"]
        },
        evening: {
          title: "Rooftop Cocktails in Imerovigli",
          desc: "Sip signature cocktails — cucumber ouzo spritz, Mastic Sour — at a rooftop bar perched on the highest point of the caldera rim as the stars emerge over the Aegean.",
          tags: ["relax", "food"]
        }
      },
      {
        title: "Pyrgos Village & Final Luxury",
        morning: {
          title: "Pyrgos Medieval Village at Dawn",
          desc: "Rise early and drive to the medieval hilltop village of Pyrgos — completely untouristy before 9am, with the best 360° views on the island and a tiny cafe making great coffee.",
          tags: ["culture", "hidden"]
        },
        afternoon: {
          title: "Private Spa & Infinity Pool Day",
          desc: "Return to your villa for a private spa treatment, followed by a full afternoon in your infinity pool — sipping chilled Assyrtiko and reading while the Aegean shimmers below.",
          tags: ["relax"]
        },
        evening: {
          title: "Farewell: Private Sunset Cruise",
          desc: "Board a private sunset sailing yacht for your final Santorini evening — champagne, mezze, and a 360° sunset over the caldera from the water. Pure magic.",
          tags: ["relax", "food"]
        }
      }
    ]
  },
  iceland: {
    title: "Iceland: Solitude & Natural Wonder",
    days: [
      {
        title: "Reykjavik & First Wonders",
        morning: {
          title: "Hallgrímskirkja Church & City Walk",
          desc: "Start at the iconic church tower for panoramic views, then wander the colourful streets of Reykjavik's old town — tiny, walkable, and genuinely unique in character.",
          tags: ["culture"]
        },
        afternoon: {
          title: "Golden Circle: Geysir & Gullfoss",
          desc: "Drive the legendary Golden Circle — watch Strokkur geyser erupt every 5 minutes, then stand at the edge of Gullfoss waterfall as glacial water thunders into the canyon.",
          tags: ["nature", "adventure"]
        },
        evening: {
          title: "Geothermal Hot Pot Soak",
          desc: "Find a secret natural hot pot in the Hveragerði valley — not the Blue Lagoon, but a wild hillside pool that locals actually use, with nothing above you but the sky.",
          tags: ["relax", "hidden"]
        }
      },
      {
        title: "South Coast: Waterfalls & Black Sand",
        morning: {
          title: "Seljalandsfoss & Behind-the-Falls",
          desc: "Walk behind the 60m curtain of Seljalandsfoss waterfall — getting drenched is part of the ritual. Then visit hidden Gljúfrabúi waterfall just 500m away that most people miss.",
          tags: ["nature", "hidden"]
        },
        afternoon: {
          title: "Reynisfjara Black Sand Beach",
          desc: "Stand on the most dramatic beach in Iceland — jet black volcanic sand, towering basalt columns, and massive Atlantic waves crashing with primal force. Respect the sneaker waves.",
          tags: ["nature", "adventure"]
        },
        evening: {
          title: "Northern Lights Hunt",
          desc: "Drive east away from light pollution and pull over wherever the sky ignites. On a clear night, the aurora can fill the horizon in waves of green, violet, and white fire.",
          tags: ["nature", "hidden"]
        }
      },
      {
        title: "Glacier Walk & Ice Cave",
        morning: {
          title: "Sólheimajökull Glacier Trek",
          desc: "Strap on crampons and walk the surface of a living glacier with a guide — learning how Iceland's glaciers are changing and exploring a world of blue crevasses and ice ridges.",
          tags: ["adventure", "nature"]
        },
        afternoon: {
          title: "Blue Ice Cave at Vatnajökull",
          desc: "Enter a natural ice cave beneath Europe's largest glacier — walls of surreal electric-blue ancient ice formed under centuries of pressure. One of Earth's most alien landscapes.",
          tags: ["adventure", "nature", "hidden"]
        },
        evening: {
          title: "Lamb Soup by the Fire at a Farmhouse",
          desc: "End the day at a remote farmhouse guesthouse with a bowl of traditional Icelandic lamb soup (kjötsúpa), homemade rye bread, and skyr dessert by a roaring fire.",
          tags: ["food", "relax"]
        }
      },
      {
        title: "East Fjords: Silence & Solitude",
        morning: {
          title: "Jökulsárlón Glacier Lagoon",
          desc: "Arrive at the glacial lagoon at sunrise — huge icebergs, calved from Breiðamerkurjökull, drift silently across the still water while seals watch from nearby ice floes.",
          tags: ["nature", "relax"]
        },
        afternoon: {
          title: "Diamond Beach",
          desc: "Walk 200m to Diamond Beach where the same icebergs wash onto the black sand and glitter like scattered diamonds as waves sweep over them. Utterly otherworldly.",
          tags: ["nature", "hidden"]
        },
        evening: {
          title: "Stargazing from a Remote Cabin",
          desc: "Stay in an isolated cabin in the East Fjords — no phone signal, no light pollution. Just you, the Milky Way, and the sound of the wind.",
          tags: ["relax", "nature"]
        }
      },
      {
        title: "Hot Rivers & Farewell",
        morning: {
          title: "Landmannalaugar Hot Springs Hike",
          desc: "Hike the rhyolite mountains of the Highlands — mountains striped in green, pink, yellow, and black from volcanic minerals — ending in a natural geothermal river.",
          tags: ["nature", "adventure"]
        },
        afternoon: {
          title: "Reykjavik Food Hall & Skyr Tastings",
          desc: "Return to Reykjavik and explore the Hlemmur food hall — try Icelandic hot dogs (the best in the world, apparently), fresh lobster soup, and skyr in seven flavors.",
          tags: ["food"]
        },
        evening: {
          title: "Final Soak: Reykjavik Sky Lagoon",
          desc: "Your farewell ritual: an hour at Sky Lagoon's infinity geothermal pool, perched on a sea cliff at sunset — the ocean merging with the heated water and the horizon beyond.",
          tags: ["relax"]
        }
      }
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
  } else if (['page-dashboard', 'page-quiz', 'page-destinations', 'page-itinerary'].includes(pageId)) {
    navbar.classList.add('dark-mode');
  } else {
    navbar.classList.add('solid');
  }
  // Update nav link visibility
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
        <div class="user-avatar" style="width:36px;height:36px;font-size:0.9rem">${state.user.name.charAt(0).toUpperCase()}</div>
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
  if (tab === 'signup') {
    handleSignup();
  } else {
    handleLogin();
  }
}

async function logout() {
  if (auth0Client) {
    await auth0Client.logout({
      logoutParams: { returnTo: window.location.origin }
    });
  }
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

// ===== AUTH =====
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`form-${tab}`)?.classList.add('active');
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  if (auth0Client) {
    await auth0Client.loginWithRedirect();
  } else {
    showToast('Login failed: Auth0 is not connected. Are you using localhost?', 'info');
  }
}

async function handleSignup(e) {
  if (e) e.preventDefault();
  if (auth0Client) {
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      }
    });
  } else {
    showToast('Signup failed: Auth0 is not connected. Are you using localhost?', 'info');
  }
}

// ===== DASHBOARD =====
function updateDashboard() {
  const el = document.getElementById('dash-user-name');
  if (el && state.user) el.textContent = state.user.name.split(' ')[0];

  const greeting = document.getElementById('dash-greeting');
  const hour = new Date().getHours();
  if (greeting) greeting.textContent = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Update progress steps
  const steps = document.querySelectorAll('.progress-step');
  steps.forEach((step, i) => {
    step.classList.remove('complete', 'active');
    if (i === 0) step.classList.add('complete'); // Signed up
    else if (i === 1 && state.personalityType) step.classList.add('complete');
    else if (i === 2 && state.selectedDestination) step.classList.add('complete');
    else if (i === 1 && !state.personalityType) step.classList.add('active');
    else if (i === 2 && state.personalityType && !state.selectedDestination) step.classList.add('active');
    else if (i === 3 && state.selectedDestination) step.classList.add('active');
  });

  // Update quiz action card
  const quizStatus = document.getElementById('quiz-card-status');
  const quizCta = document.getElementById('quiz-card-cta');
  if (state.personalityType) {
    if (quizStatus) quizStatus.textContent = `Result: ${personalityTypes[state.personalityType]?.title}`;
    if (quizCta) { quizCta.textContent = 'Retake Quiz'; quizCta.className = 'btn btn-outline btn-sm'; }
  }

  // Update sidebar user
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarEmail = document.getElementById('sidebar-user-email');
  const sidebarAvatar = document.getElementById('sidebar-avatar');
  if (state.user) {
    if (sidebarName) sidebarName.textContent = state.user.name;
    if (sidebarEmail) sidebarEmail.textContent = state.user.email;
    if (sidebarAvatar) sidebarAvatar.textContent = state.user.name.charAt(0).toUpperCase();
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
        <button class="quiz-nav-btn back" onclick="quizBack()" ${step === 0 ? 'style="visibility:hidden"' : ''}>
          ← Back
        </button>
        <button class="quiz-nav-btn next" id="quiz-next-btn" onclick="quizNext()" disabled>
          ${step === total - 1 ? 'See Results →' : 'Next →'}
        </button>
      </div>
    </div>
  `;

  // Re-select if already answered
  if (state.quizAnswers[step] !== undefined) {
    const opts = container.querySelectorAll('.quiz-option');
    opts[state.quizAnswers[step].index]?.classList.add('selected');
    opts[state.quizAnswers[step].index]?.querySelector('.option-letter')?.classList.add('selected');
    document.getElementById('quiz-next-btn').disabled = false;
  }
}

function selectAnswer(index) {
  const q = quizQuestions[state.quizStep];
  state.quizAnswers[state.quizStep] = { type: q.options[index].type, index };

  document.querySelectorAll('.quiz-option').forEach((opt, i) => {
    opt.classList.toggle('selected', i === index);
  });

  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) nextBtn.disabled = false;

  // Auto-advance after a short delay
  setTimeout(() => quizNext(), 400);
}

function quizNext() {
  if (state.quizAnswers[state.quizStep] === undefined) return;
  state.quizStep++;
  renderQuizStep();
}

function quizBack() {
  if (state.quizStep > 0) {
    state.quizStep--;
    renderQuizStep();
  }
}

function calculatePersonality() {
  const scores = {};
  state.quizAnswers.forEach(a => {
    if (a && a.type) scores[a.type] = (scores[a.type] || 0) + 1;
  });

  // Find dominant type
  let dominant = 'cultural';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; dominant = type; }
  }

  state.personalityType = dominant;
  const pt = personalityTypes[dominant];

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
        <button class="btn btn-primary btn-lg" onclick="goToDestinations()">
          See My Destinations →
        </button>
        <button class="btn btn-outline btn-lg" onclick="startQuiz()">
          Retake Quiz
        </button>
      </div>
    </div>
  `;

  document.getElementById('quiz-progress-fill').style.width = '100%';
  document.getElementById('quiz-step-current').textContent = quizQuestions.length;

  if (state.user) {
    updateDashboard();
    // Save quiz result to the backend (fire-and-forget)
    apiFetch('/quiz-results/', {
      method: 'POST',
      body: JSON.stringify({
        personality_type: pt.title,
        answers: Object.fromEntries(state.quizAnswers.map((a, i) => [`q${i + 1}`, a?.type])),
      }),
    }).catch(() => {});
  }
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

  // Update header
  document.getElementById('dest-personality-emoji').textContent = pt.emoji;
  document.getElementById('dest-personality-type').textContent = pt.title;

  // Filter destinations
  const matched = allDestinations
    .filter(d => d.types.includes(state.personalityType))
    .sort((a, b) => b.match - a.match);

  const others = allDestinations
    .filter(d => !d.types.includes(state.personalityType))
    .slice(0, Math.max(0, 4 - matched.length));

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
        <div class="destination-tags">
          ${d.tags.map(t => `<span class="destination-tag">${t}</span>`).join('')}
        </div>
        <div class="destination-meta">
          <span>🗓 ${d.duration}</span>
          <span>💰 ${d.budget}</span>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="event.stopPropagation();selectAndGoToItinerary('${d.id}')">
          Choose ${d.name} →
        </button>
      </div>
    </div>
  `).join('');
}

function selectDestination(id) {
  state.selectedDestination = id;
  document.querySelectorAll('.destination-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`dest-card-${id}`)?.classList.add('selected');
}

function selectAndGoToItinerary(id) {
  state.selectedDestination = id;
  if (state.user) updateDashboard();
  showPage('page-itinerary');
  renderItinerary(id);
}

// ===== ITINERARY =====
function renderItinerary(destId) {
  const dest = allDestinations.find(d => d.id === destId);
  const itin = itineraryData[destId] || itineraryData['kyoto'];
  const pt = personalityTypes[state.personalityType || 'cultural'];

  if (!dest || !itin) return;

  // Hero
  document.getElementById('itin-emoji').textContent = dest.emoji;
  document.getElementById('itin-title').textContent = itin.title;
  document.getElementById('itin-subtitle').textContent = `A ${pt.title} itinerary for ${dest.name}, ${dest.country}`;
  document.getElementById('itin-personality').textContent = `${pt.emoji} ${pt.title}`;

  // Days
  const container = document.getElementById('itinerary-days');
  const timeIcons = { morning: '🌅', afternoon: '☀️', evening: '🌙' };

  container.innerHTML = itin.days.map((day, i) => `
    <div class="day-card">
      <div class="day-header">
        <div>
          <div class="day-number">Day ${i + 1}</div>
          <div class="day-title">${day.title}</div>
        </div>
        <div class="day-date">📅 Day ${i + 1} of 5</div>
      </div>
      <div class="day-activities">
        ${['morning', 'afternoon', 'evening'].map(time => {
          const act = day[time];
          if (!act) return '';
          return `
            <div class="time-block">
              <div class="time-label">
                <div class="time-icon ${time}">${timeIcons[time]}</div>
                <div class="time-text">${time.charAt(0).toUpperCase() + time.slice(1)}</div>
              </div>
              <div class="activity-content">
                <h4>${act.title}</h4>
                <p>${act.desc}</p>
                <div class="activity-tags">
                  ${(act.tags || []).map(tag => `<span class="activity-tag ${tag}">${tag.charAt(0).toUpperCase() + tag.slice(1)}</span>`).join('')}
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

async function saveItinerary() {
  if (!state.user) { showToast('Please sign in to save itineraries.', 'info'); return; }

  const dest = allDestinations.find(d => d.id === state.selectedDestination);
  const itin = itineraryData[state.selectedDestination];
  if (!dest || !itin) { showToast('No itinerary to save.', 'info'); return; }

  try {
    const res = await apiFetch('/itineraries/', {
      method: 'POST',
      body: JSON.stringify({
        destination: `${dest.name}, ${dest.country}`,
        title: itin.title,
        personality_type: personalityTypes[state.personalityType]?.title || state.personalityType,
        trip_duration: dest.duration,
        itinerary_details: itin.days,
        notes: '',
      }),
    });
    if (res.ok) {
      state.savedItinerary = true;
      showToast('Itinerary saved to your dashboard!');
      if (state.user) updateDashboard();
    } else {
      showToast('Could not save itinerary.', 'info');
    }
  } catch {
    showToast('Could not connect to the server.', 'info');
  }
}

function printItinerary() {
  window.print();
}

// ===== CONTACT FORM =====
function handleContact(e) {
  e.preventDefault();
  showToast('Message sent! We\'ll get back to you within 24 hours.');
  e.target.reset();
}

// ===== SCROLL EFFECT =====
function handleScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  if (state.currentPage === 'page-home') {
    if (window.scrollY > 80) {
      navbar.classList.remove('transparent');
      navbar.classList.add('solid');
    } else {
      navbar.classList.remove('solid');
      navbar.classList.add('transparent');
    }
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Auth0 and resolve redirect states
  await checkSession();

  if (state.user) {
    showPage('page-dashboard');
  } else {
    showPage('page-home');
  }
  window.addEventListener('scroll', handleScroll);

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  // Login form
  document.getElementById('form-login')?.addEventListener('submit', handleLogin);

  // Signup form
  document.getElementById('form-signup')?.addEventListener('submit', handleSignup);

  // Contact form
  document.getElementById('contact-form')?.addEventListener('submit', handleContact);

  // Animate hero stats on load
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
