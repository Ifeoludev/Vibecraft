# Vibecraft

Describe a mood or feeling. Vibecraft uses AI to generate a matching playlist and exports it directly to your YouTube Music library.

**Live demo**: [vibecraft.vercel.app](https://vibecraft.vercel.app)

---

## What it does

1. You type a vibe description — *"late night drive, nostalgic and a little lost"*
2. Gemini 2.5 Flash interprets the mood and suggests 20 matching songs
3. Each suggestion is looked up on YouTube, verified against the actual video metadata, and filtered for quality
4. You get a playlist of real, playable YouTube videos
5. One click exports it as a private playlist to your YouTube Music account

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 | Fast dev experience, Tailwind v4's new CSS-first config |
| Backend | Node.js + Express + TypeScript | Lightweight, enough for this scale |
| Database | PostgreSQL + Prisma ORM | Relational with a JSON column for songs — hybrid approach |
| AI | Gemini 2.5 Flash | Google ecosystem fit, generous free tier, structured JSON output |
| Music matching | MusicAPI + YouTube Data API | MusicAPI handles search (saves YouTube quota), YouTube verifies |
| Auth | Google OAuth 2.0 + JWT in httpOnly cookies | XSS-safe, no localStorage tokens |
| State | TanStack React Query + Zustand | Server state vs client state, separated cleanly |
| Monorepo | npm workspaces | Shared `@vibecraft/types` package between client and server |
| Containerization | Docker + docker-compose | Consistent environments, Render deployment |

---

## Architecture — The Music Matching Pipeline

The most interesting part of the system. Gemini returns song names and artists — not YouTube links. Converting 20 text suggestions into verified, playable video IDs happens in three phases:

```
Gemini suggestion: { title: "Cornerstone", artist: "Hillsong Worship" }
        │
        ▼
┌─────────────────────────────────┐
│  Phase 1: MusicAPI search       │  → candidate video ID from YouTube
│  POST /public/search            │
└─────────────────────────────────┘
        │ success              │ fail (429 / down)
        ▼                      │
┌──────────────────────┐        │
│  Phase 2: Verify ID  │        │
│  YouTube videos.list │        │
│  Scoring:            │        │
│  title match  → +2   │        │
│  artist match → +1   │        │
│  cover/karaoke → -∞  │        │
│  score ≥ 3 → pass    │        │
└──────────────────────┘        │
   pass │       fail │           │
        │            ▼           ▼
        │   ┌────────────────────────┐
        │   │  Phase 3: YouTube      │
        │   │  search fallback       │
        │   │  search.list, top 5    │
        │   │  Same scoring system   │
        │   └────────────────────────┘
        │            │ pass   │ fail
        ▼            ▼        ▼
    confirmed      confirmed  dropped
```

All 20 songs run in parallel via `Promise.allSettled`. One failure doesn't affect the others. If fewer than 10 songs survive, the request is rejected — the playlist would be too short to be useful.

---

## Key Design Decisions & Trade-offs

**Songs stored as a JSON column, not a separate table**

Each playlist has a `songs` JSON column rather than a normalised `songs` table with foreign keys. This makes playlist creation a single insert and retrieval a single query. The trade-off is you can't query individual songs across playlists — acceptable since the app never needs to do that.

**MusicAPI as primary, YouTube as fallback**

YouTube's `search.list` endpoint costs 100 API units per call. With 20 songs per generation, pure YouTube search would cost 2,000 units per playlist — hitting the 10,000 daily limit after just 5 generations. MusicAPI handles the search against its own quota. YouTube is only used for verification (`videos.list` at 1 unit per call) and as a fallback when MusicAPI fails. This reduces YouTube quota usage by ~99x per generation.

**Two-stage verification instead of trusting MusicAPI directly**

MusicAPI can return covers, wrong artists, or unrelated videos. A scoring system cross-references each candidate against YouTube's own metadata — the video title must contain the song name (+2) and the artist must appear in the title or channel name (+1). Score below 3 triggers a fresh YouTube search. This catches bad matches without extra quota cost since `videos.list` is 1 unit.

**JWT in httpOnly cookies over localStorage**

localStorage tokens are readable by any JavaScript on the page — a single XSS vulnerability exposes every user's session. httpOnly cookies are invisible to JS entirely. The trade-off is cross-origin complexity: in production the cookie needs `SameSite=None; Secure` so it travels from the Vercel frontend to the Render backend. In development it uses `SameSite=Lax` since both run on localhost.

**Daily generation limit (4 per user)**

Gemini, MusicAPI, and YouTube all have rate limits and/or costs. An unbounded app could exhaust quotas or incur unexpected charges overnight. 4 generations per day is enough for normal use and protects against abuse. The limit is enforced server-side and surfaced in the UI — the counter reads from the server so it can never be spoofed by changing a client-side constant.

**Prompt injection protection**

User vibe descriptions are passed directly into a Gemini prompt. A basic regex check rejects inputs containing patterns like *"ignore previous instructions"* or *"you are now"* before the prompt is ever sent to Gemini. Not exhaustive, but it stops the obvious attacks.

---

## What I Learned

- **YouTube API quota is a design constraint, not an afterthought.** `search.list` (100 units) vs `videos.list` (1 unit) shaped the entire music matching architecture. Without understanding the cost difference, the app would hit its daily limit after 5 uses.

- **Cross-origin cookies are non-trivial.** `SameSite=Lax` works fine on localhost but silently drops cookies on cross-origin fetch requests in production. This only surfaces when you actually deploy — not during local development.

- **OAuth token lifecycle has edge cases.** Google occasionally rotates refresh tokens during a refresh. Discarding the new token (keeping the old, now-invalid one) causes a silent auth failure the next time the access token expires. Small fix, easy to miss.

- **LLMs hallucinate specific data.** Gemini can name real songs accurately but cannot be trusted to return valid YouTube video IDs — those require real-time lookup. The architecture reflects this: Gemini handles what it's good at (mood → song names), and APIs handle what requires current data (song names → video IDs).

- **Monorepo workspace setup with shared types.** Keeping `@vibecraft/types` as a shared package means the `Song` interface is defined once and used by both the Express server and the React client — no duplicated types, no drift.

---

## Running Locally

**Prerequisites:** Node.js 20+, Docker Desktop

**1. Clone and install**
```bash
git clone https://github.com/Ifeoludev/Vibecraft.git
cd vibecraft
npm install
```

**2. Environment variables**

Create `apps/server/.env`:
```env
NODE_ENV=development
DATABASE_URL=postgresql://vibecraft:vibecraft@localhost:5434/vibecraft
JWT_SECRET=any-long-random-string
ENCRYPTION_KEY=exactly-32-characters-long-here!
GEMINI_API_KEY=your-gemini-api-key
MUSIC_API_KEY=your-musicapi-key
YOUTUBE_API_KEY=your-youtube-data-api-key
YOUTUBE_CLIENT_ID=your-google-oauth-client-id
YOUTUBE_CLIENT_SECRET=your-google-oauth-client-secret
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3001
```

Create `apps/client/.env`:
```env
VITE_API_URL=http://localhost:3001
```

**3. Start the database**
```bash
docker-compose up postgres -d
```

**4. Run migrations**
```bash
cd apps/server && npx prisma migrate dev
```

**5. Start the server**
```bash
cd apps/server && npm run dev
```

**6. Start the client**
```bash
cd apps/client && npm run dev
```

App runs at `http://localhost:5173`

---

## Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | Server | PostgreSQL connection string |
| `JWT_SECRET` | Server | Signs JWT tokens — keep secret, min 32 chars |
| `ENCRYPTION_KEY` | Server | Encrypts OAuth tokens at rest — exactly 32 chars |
| `GEMINI_API_KEY` | Server | Google AI Studio API key |
| `MUSIC_API_KEY` | Server | MusicAPI.com key for YouTube search |
| `YOUTUBE_API_KEY` | Server | YouTube Data API v3 key (for verification) |
| `YOUTUBE_CLIENT_ID` | Server | Google OAuth client ID (YouTube scope) |
| `YOUTUBE_CLIENT_SECRET` | Server | Google OAuth client secret |
| `CLIENT_URL` | Server | Frontend URL — used for CORS and OAuth redirects |
| `SERVER_URL` | Server | Backend URL — used for OAuth callback URIs |
| `VITE_API_URL` | Client | Backend URL — injected at build time by Vite |
