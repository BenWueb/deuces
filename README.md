# Deuces

A mobile-first tennis court finder built with Next.js, Tailwind CSS, Neon Postgres (PostGIS), Drizzle ORM, Auth.js, and Leaflet.

Find courts near you, view them on a map, add new courts with photos, rate them, and leave comments.

## Features

- **Explore** — search courts, sort by distance with geolocation
- **Map** — interactive OpenStreetMap with viewport-based court loading
- **Court details** — photos, amenities, ratings, comments, Google Maps directions
- **Add courts** — address search via Nominatim, draggable pin, photo upload
- **Auth** — Google sign-in via Auth.js with JWT sessions

## Tech stack

- Next.js 16 (App Router, Turbopack)
- Tailwind CSS v4
- Neon Postgres + PostGIS
- Drizzle ORM
- Auth.js v5 (`next-auth@beta`) + `@auth/drizzle-adapter`
- Leaflet + react-leaflet (OpenStreetMap tiles)
- Vercel Blob (photo storage)

## Getting started

### 1. Clone and install

```bash
cd deuces
npm install
```

### 2. Set up Neon Postgres

1. Create a project at [neon.tech](https://neon.tech)
2. Copy your connection string
3. Enable PostGIS by running in the Neon SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `AUTH_URL` | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_MAPS_API_KEY` | Google key with **Places API (New)** (court import) and **YouTube Data API v3** (Learn Tennis channel lookup). Optional override: `YOUTUBE_API_KEY` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (optional for local photo upload) |

### 4. Run migrations and seed

Apply the SQL migrations in order:

```bash
npm run db:apply drizzle/0000_init.sql
npm run db:apply drizzle/0001_user_roles.sql
npm run db:apply drizzle/0002_fix_location_srid.sql
npm run db:apply drizzle/0003_court_import.sql
npm run db:apply drizzle/0004_feedback.sql
npm run db:apply drizzle/0005_court_source_google.sql
```

Use these files rather than `db:push` — drizzle-kit emits `courts.location` as
`geometry(point)` without an SRID, which makes PostGIS reject the map's bounds
and radius queries.

Seed sample courts:

```bash
npm run db:seed
```

### 5. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create OAuth 2.0 credentials (**Web application**)
3. **Authorized JavaScript origins**
   - Local: `http://localhost:3000`
   - Production: `https://www.playdeuces.app` (and `https://playdeuces.app` if you use the apex)
4. **Authorized redirect URIs** (must match Auth.js exactly — no trailing slash on the origin)
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://www.playdeuces.app/api/auth/callback/google`
   - Apex (if used): `https://playdeuces.app/api/auth/callback/google`
5. Copy client ID and secret to `.env.local` and to Vercel **Environment Variables** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_URL=https://www.playdeuces.app`)
6. OAuth consent screen: add yourself as a **Test user** while the app is in Testing, or publish the app for public sign-in

### 6. Google Places (court import)

Import runs **on the server** (not in the browser), so the key must allow requests with no HTTP referrer.

1. In Google Cloud, enable **Places API (New)** and billing
2. Create an API key and set `GOOGLE_MAPS_API_KEY` in `.env.local`
3. **Application restrictions**
   - Local/dev: **None**
   - Production: **IP addresses** (your server / Vercel egress), **not** HTTP referrers
4. **API restrictions**: allow **Places API (New)** and **YouTube Data API v3** (Learn Tennis channel lookup)

If you see `Requests from referer <empty> are blocked`, the key is locked to browser referrers — change it as above.

Without this key, `/courts/import` search returns a clear configuration error.

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/              # Next.js App Router pages and API routes
  components/       # UI components (courts, map, layout)
  lib/
    actions/        # Server Actions (create court, rate, comment)
    db/             # Drizzle schema and client
    queries/        # Database queries (geo search, court details)
    validation/     # Zod schemas and the profanity filter
    auth.ts         # Auth.js configuration
drizzle/            # SQL migrations
scripts/seed.ts     # Sample court data
```

## Input validation

Every user-supplied value is parsed with Zod before it reaches the database.

- `validation/schemas.ts` holds the field rules and is safe to import in the
  browser, so the form can show inline errors before submitting.
- `validation/server.ts` is the authoritative version. It re-runs those rules
  and adds the profanity checks, and is marked `server-only` so the word list
  never ships to the client.
- `validation/moderation.ts` wraps [obscenity](https://github.com/jo3-l/obscenity).
  It catches obfuscated spellings (`sh1t`, `f u c k`, `a$$`) and carries an
  allowlist for real place names the dictionary misreads, such as Penistone. If
  a legitimate court name is ever rejected, add it to that allowlist.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:apply <file>` | Apply a SQL migration |
| `npm run db:seed` | Seed sample courts |
| `npm run set-admin` | List users / promote an admin |

## Design

The UI uses a tennis-inspired palette:

- **Court blue** — primary brand color (hard court)
- **Clay terracotta** — secondary accent
- **Optic yellow** — CTAs and active states (tennis ball)
- **Chalk white** — borders echoing court lines

Mobile-first with a bottom tab bar (Explore, Map, Add, Profile).
