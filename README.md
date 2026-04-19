# Itinerate — Backend Server

Node.js + Express backend with SQLite database for user authentication and itinerary storage.

---

## Tech Stack

| Layer       | Technology          |
|-------------|---------------------|
| Runtime     | Node.js 18+         |
| Framework   | Express 4           |
| Database    | SQLite (better-sqlite3) |
| Auth        | bcryptjs + JWT      |
| CORS        | cors middleware     |

---

## Project Structure

```
itinerate-backend/
├── server.js             # Entry point — Express app
├── db.js                 # SQLite init & connection
├── middleware/
│   └── auth.js           # JWT verification middleware
├── routes/
│   ├── auth.js           # /api/auth/* endpoints
│   └── itinerary.js      # /api/itinerary/* endpoints
├── public/               # ← Put your HTML/CSS/JS frontend here
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js         # Use the updated app.js from public-js/
├── public-js/
│   └── app.js            # Updated frontend JS (copy to public/js/)
├── .env.example          # Environment variable template
├── .gitignore
└── package.json
```

---

## Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Open `.env` and update:
```env
JWT_SECRET=replace-with-a-long-random-string
PORT=3000
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Set up the frontend files
Create a `public/` folder and copy your frontend into it:
```
public/
├── index.html       ← your existing index.html
├── css/
│   └── style.css    ← your existing style.css
└── js/
    └── app.js       ← copy from public-js/app.js (the updated version)
```

### 4. Start the server
```bash
# Production
npm start

# Development (auto-restarts on file changes, Node 18+)
npm run dev
```

Visit: **http://localhost:3000**

The Express server serves your frontend AND handles API requests at `/api/*`.

---

## API Reference

### Auth Endpoints

#### `POST /api/auth/register`
Create a new user account.

**Request body:**
```json
{
  "firstName": "Alex",
  "lastName": "Kim",
  "email": "alex@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "message": "Account created successfully.",
  "token": "eyJhbGci...",
  "user": { "id": 1, "first_name": "Alex", "last_name": "Kim", "email": "alex@example.com", "created_at": "..." }
}
```

---

#### `POST /api/auth/login`
Log in to an existing account.

**Request body:**
```json
{ "email": "alex@example.com", "password": "securepassword123" }
```

**Response (200):**
```json
{ "message": "Login successful.", "token": "eyJhbGci...", "user": { ... } }
```

---

#### `GET /api/auth/me` 🔒
Get the current logged-in user. Requires `Authorization: Bearer <token>`.

---

#### `PUT /api/auth/profile` 🔒
Update the user's name.

---

### Itinerary Endpoints (all require Bearer token)

#### `POST /api/itinerary`
Save (or update) an itinerary for the logged-in user.

**Request body:**
```json
{
  "destinationId": "kyoto",
  "destinationName": "Kyoto",
  "personalityType": "cultural",
  "itinerary": { ... }
}
```

One saved itinerary per user per destination (upsert).

---

#### `GET /api/itinerary`
List all saved itineraries for the logged-in user.

---

#### `GET /api/itinerary/:destinationId`
Get a specific saved itinerary (e.g. `/api/itinerary/kyoto`).

---

#### `DELETE /api/itinerary/:destinationId`
Delete a saved itinerary.

---

#### `POST /api/itinerary/quiz/save`
Save a quiz result.

```json
{
  "personalityType": "cultural",
  "answers": [{ "type": "cultural", "index": 1 }, ...]
}
```

---

#### `GET /api/itinerary/quiz/latest`
Get the most recent quiz result for the logged-in user.

---

## Database

The SQLite database (`itinerate.db`) is created automatically on first run.

### Tables

**`users`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT UNIQUE | Case-insensitive |
| password_hash | TEXT | bcrypt, 12 rounds |
| created_at | TEXT | UTC datetime |

**`quiz_results`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users.id |
| personality_type | TEXT | e.g. "cultural" |
| answers_json | TEXT | JSON array |
| taken_at | TEXT | UTC datetime |

**`itineraries`**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users.id |
| destination_id | TEXT | e.g. "kyoto" |
| destination_name | TEXT | |
| personality_type | TEXT | |
| itinerary_json | TEXT | Full itinerary |
| saved_at | TEXT | |
| updated_at | TEXT | Updated on re-save |

---

## Frontend Changes (app.js)

The updated `public-js/app.js` replaces the old in-memory auth with real API calls:

- **Register/Login** → calls `/api/auth/register` and `/api/auth/login`, stores JWT in `localStorage`
- **Session restore** → on page load, reads JWT from `localStorage` and calls `/api/auth/me` to restore session
- **Quiz save** → after completing quiz, saves result via `POST /api/itinerary/quiz/save`
- **Save Itinerary** → calls `POST /api/itinerary` to persist to database under the user's account
- **Logout** → clears JWT from `localStorage`

---

## Deployment Notes

### Environment variables to change for production:
- `JWT_SECRET` → long random string (64+ characters)
- `ALLOWED_ORIGIN` → your frontend domain, e.g. `https://itinerate.co`
- `PORT` → set by your hosting provider (Render, Railway, Fly.io)

### Recommended hosting:
- **Railway** or **Render** — free tier works, auto-detects Node.js
- SQLite database file persists on disk; for high-traffic production consider migrating to **PostgreSQL** with the `pg` package

### To use PostgreSQL instead of SQLite:
Replace `better-sqlite3` with `pg`, update `db.js` queries to use `$1/$2` placeholders, and set a `DATABASE_URL` environment variable.
