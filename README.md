# Itinerate — AI-Powered Travel Planning Platform

Itinerate is a full-stack web application that generates personalized travel itineraries using AI agents. Users answer a travel personality quiz, describe their trip in natural language, and receive a complete itinerary with real-time flight and hotel options — all saved to their account.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [AI Agent System](#ai-agent-system)
- [Security](#security)
- [Admin Panel](#admin-panel)

---

## Architecture Overview

Itinerate uses a two-server architecture:

```
Browser (SPA)
     │
     ▼
Express Server (Node.js · :3000)
     ├── REST API (/api/*)
     ├── Serves static frontend (public/)
     └── Proxies AI requests
          │
          ▼
     Flask Server (Python · :5000)
          ├── /flights  →  CrewAI Agent + SerpAPI
          └── /hotels   →  SerpAPI
```

The Express server handles authentication, data persistence, and the Gemini chatbot. The Flask server hosts CrewAI agents that parse natural language travel queries and invoke external search APIs.

---

## Technology Stack

### Node.js Backend
| Package | Version | Purpose |
|---|---|---|
| Express | 5.2.1 | REST API framework |
| better-sqlite3 | 12.9.0 | SQLite database (WAL mode) |
| jsonwebtoken | 9.0.3 | JWT authentication (7-day expiry) |
| bcryptjs | 3.0.3 | Password hashing (12 salt rounds) |
| nodemailer | 8.0.5 | Email via Gmail SMTP |
| @google/generative-ai | 0.21.0 | Gemini AI chatbot |
| cors | 2.8.6 | Cross-origin resource sharing |
| concurrently | 9.2.1 | Run both servers simultaneously |

### Python Backend
| Package | Purpose |
|---|---|
| Flask | Lightweight HTTP server for agent endpoints |
| crewai 1.13.0 | Multi-agent orchestration framework |
| chromadb | Vector database (future query history) |
| sentence-transformers | Semantic embeddings |
| requests | HTTP calls to SerpAPI |

### Frontend
- Vanilla JavaScript single-page application (no framework)
- CSS Grid/Flexbox responsive layout
- Local Storage for JWT persistence
- Fetch API for all backend communication

### External Services
| Service | Use |
|---|---|
| SerpAPI | Google Flights and Hotels search |
| Google Gemini | In-app AI support chatbot |
| OpenAI | CrewAI agent LLM (gpt-4o-mini) |
| Gmail SMTP | Contact form email delivery |

---

## Features

### User-Facing
- **Travel Personality Quiz** — 8-question assessment producing one of 7 travel personas (Adventure, Cultural Explorer, Luxury, Relaxation, Introvert, Foodie, Lightweight Adventurer) that shapes the tone and activities in every itinerary
- **Natural Language Flight Search** — Type "fly from NYC to Paris in 2 weeks" and receive structured results; the CrewAI agent resolves relative dates, maps city names to IATA codes, and queries SerpAPI
- **Hotel Search** — Search by destination, dates, and optional max price; results include star rating, review count, amenities, and images
- **AI Itinerary Generation** — Day-by-day travel plan personalized to the user's quiz result and selected destination
- **Trip Saving** — Full itinerary (flights, hotel, day plans) saved per user per destination; upserts on re-save
- **AI Support Chatbot** — Persistent Gemini-powered assistant available from any page
- **User Profiles** — Account management with name updates

### Administrative
- **Admin Dashboard** — User list, itinerary list, aggregate statistics
- **User Management** — Promote/demote admin status, delete accounts
- **Itinerary Management** — View and delete any user's saved trips
- **Admin Setup** — First-run endpoint to create the initial administrator account

---

## Project Structure

```
swe-project/
├── server.js                        # Express server — API + static file serving
├── app.py                           # Flask server — AI agent endpoints
├── db.js                            # SQLite schema initialization
├── package.json
├── pyproject.toml
├── requirements.txt
│
├── routes/
│   ├── auth.js                      # Register, login, profile
│   ├── itinerary.js                 # Itinerary CRUD, quiz save/load
│   ├── contact.js                   # Contact form → email
│   └── admin.js                     # Admin-only user and itinerary management
│
├── middleware/
│   └── auth.js                      # JWT verification, admin guard
│
├── src/chromadb_document_processor/
│   ├── main.py                      # CLI entry point (train, replay, test)
│   ├── flights_crew.py              # FlightsCrew — agent + task wiring
│   ├── hotels_crew.py               # HotelsCrew
│   ├── crew.py                      # Module exports
│   ├── config/
│   │   ├── agents.yaml              # Agent role, goal, backstory definitions
│   │   └── tasks.yaml               # Task descriptions and expected output format
│   └── tools/
│       ├── flight_search_tool.py    # SerpAPI Google Flights integration
│       ├── hotel_search_tool.py     # SerpAPI Google Hotels integration
│       └── custom_tool.py           # Base tool class
│
└── public/                          # Frontend SPA
    ├── index.html                   # Single HTML shell
    ├── js/app.js                    # All page logic and API calls
    └── css/style.css                # Global styles
```

---

## Prerequisites

- **Node.js** 18 or later
- **Python** 3.10 or later
- **uv** (Python package manager) — `pip install uv`
- API keys for SerpAPI, Google Gemini, and OpenAI
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833) for email delivery

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd swe-project

# Install Node dependencies
npm install

# Install Python dependencies
uv sync
```

---

## Configuration

Copy or create a `.env` file in the project root:

```env
# Server
PORT=3000
ALLOWED_ORIGIN=*

# Database
DB_PATH=./itinerate.db

# Authentication
JWT_SECRET=<128-character random string>

# AI / Search APIs
SERPAPI_API_KEY=<your SerpAPI key>
GEMINI_API_KEY=<your Google Gemini key>
OPENAI_API_KEY=<your OpenAI key>

# Email (Gmail SMTP)
EMAIL_USER=<your Gmail address>
EMAIL_PASS=<Gmail App Password>
```

> **Security note**: Never commit `.env` to version control. Generate `JWT_SECRET` with `openssl rand -hex 64`.

---

## Running the Application

### Development (both servers)

```bash
npm run dev
```

This uses `concurrently` to start:
- Express on `http://localhost:3000`
- Flask on `http://localhost:5000`

### Production (Node only, Flask managed separately)

```bash
# Terminal 1
python app.py

# Terminal 2
npm start
```

### Access points

| URL | Description |
|---|---|
| `http://localhost:3000` | Frontend SPA |
| `http://localhost:3000/api/health` | Health check |
| `http://localhost:3000/admin` | Admin dashboard |
| `http://localhost:5000` | Flask agent server (internal) |

### Admin Setup

On first run, create the administrator account:

```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Admin","email":"admin@example.com","password":"<password>"}'
```

This endpoint is disabled once an admin account exists.

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create user account |
| POST | `/auth/login` | — | Login → returns JWT |
| GET | `/auth/me` | Required | Get current user |
| PUT | `/auth/profile` | Required | Update display name |

### Itineraries

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/itinerary` | Required | Save or update an itinerary |
| GET | `/itinerary` | Required | List all saved itineraries |
| GET | `/itinerary/:destinationId` | Required | Get one itinerary |
| DELETE | `/itinerary/:destinationId` | Required | Delete an itinerary |
| POST | `/itinerary/quiz/save` | Required | Save quiz answers |
| GET | `/itinerary/quiz/latest` | Required | Get latest quiz result |

### Search (proxied to Flask)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/flights` | — | Natural language flight search |
| POST | `/hotels` | — | Hotel search by destination and dates |

**Flight request body:**
```json
{ "query": "fly from NYC to Paris in 2 weeks, stay for 10 days" }
```

**Hotel request body:**
```json
{
  "destination": "Paris, France",
  "check_in": "2026-05-01",
  "check_out": "2026-05-11",
  "max_price": 200
}
```

### Chat

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat` | — | Send message to Gemini chatbot |

### Contact

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/contact` | — | Submit contact form |

### Admin

All admin routes require authentication and `is_admin = 1`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/setup/status` | Check if admin exists (public) |
| POST | `/admin/setup` | Create first admin (public, one-time) |
| GET | `/admin/stats` | Aggregate user/itinerary statistics |
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/:id` | Delete a user |
| PUT | `/admin/users/:id/admin` | Toggle admin status |
| GET | `/admin/itineraries` | List all itineraries |
| DELETE | `/admin/itineraries/:id` | Delete an itinerary |

---

## Database Schema

SQLite database (`itinerate.db`) with WAL mode enabled and foreign keys enforced.

### `users`

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name    TEXT    NOT NULL,
  last_name     TEXT    DEFAULT '',
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  is_admin      INTEGER DEFAULT 0,
  created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
);
```

### `itineraries`

```sql
CREATE TABLE itineraries (
  id                            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id                TEXT    NOT NULL,
  destination_name              TEXT    NOT NULL,
  personality_type              TEXT    NOT NULL,
  itinerary_json                TEXT    NOT NULL,   -- day-by-day schedule
  flight_json                   TEXT,               -- selected outbound flight
  hotel_json                    TEXT,               -- selected hotel
  return_flight_json            TEXT,               -- selected return flight
  destination_json              TEXT,               -- destination metadata
  available_flights_json        TEXT,               -- all outbound options
  available_return_flights_json TEXT,               -- all return options
  available_hotels_json         TEXT,               -- all hotel options
  departure_date                TEXT,
  return_date                   TEXT,
  saved_at                      TEXT    DEFAULT CURRENT_TIMESTAMP,
  updated_at                    TEXT    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, destination_id)
);
```

### `quiz_results`

```sql
CREATE TABLE quiz_results (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  personality_type TEXT    NOT NULL,
  answers_json     TEXT    NOT NULL,   -- [{type, index}, ...]
  taken_at         TEXT    DEFAULT CURRENT_TIMESTAMP
);
```

---

## AI Agent System

The Python layer uses [CrewAI](https://docs.crewai.com) to orchestrate agents that interpret natural language and call external APIs.

### Flight Agent (`config/agents.yaml`)

**Role**: Flight Search Specialist

The agent resolves relative date expressions ("next week", "in 2 weeks", "early June"), maps informal location names to IATA airport codes (NYC→JFK, LA→LAX, London→LHR), infers trip duration from context, and calls the SerpAPI Google Flights tool. It returns structured JSON only — no narrative text.

**Date resolution rules:**
- "tomorrow" → today + 1 day
- "next week" → today + 7 days
- "in 2 weeks" → today + 14 days
- "2–3 weeks" → today + 18 days (midpoint)
- "early [month]" → 5th of that month
- "mid [month]" → 15th of that month
- "late [month]" → 25th of that month

### Hotel Search (`tools/hotel_search_tool.py`)

Hotels are fetched directly via SerpAPI without LLM involvement, as the input is already structured (destination, dates, budget).

### CLI Commands

```bash
# Run the flight search crew
chromadb_document_processor

# Train the crew (n iterations, saves to filename)
chromadb_document_processor train <n> <output_file>

# Replay a specific task by ID
chromadb_document_processor replay <task_id>

# Test crew output quality (n iterations)
chromadb_document_processor test <n> <model_name>
```

---

## Security

| Control | Implementation |
|---|---|
| Password storage | bcryptjs, 12 salt rounds |
| Session tokens | JWT, HS256, 7-day expiry, `JWT_SECRET` from env |
| Admin authorization | DB lookup on every request — revocations take effect immediately |
| SQL injection | Parameterized queries via better-sqlite3 |
| Error messages | Identical response for "user not found" and "wrong password" (prevents email enumeration) |
| CORS | Configurable `ALLOWED_ORIGIN`; restrict to your domain in production |

---

## Admin Panel

The admin panel is available at `/admin` and requires an admin account. Features:

- **Statistics** — Total users, total itineraries, most popular destinations
- **User Management** — View all accounts, promote/demote admin, delete users (cascades to itineraries and quiz results)
- **Itinerary Management** — Browse and delete any user's saved trips

The first admin account is created via the `/api/admin/setup` endpoint (one-time, disables itself after use).
