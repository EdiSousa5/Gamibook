# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GamiBook is a gamified reading platform where users read books, answer exercises, earn points, and level up. It is a monorepo with three runtime services:

- **client** — Vue 3 SPA (port 5173)
- **server** — Express.js REST API (port 3000)
- **Directus** — headless CMS and primary datastore (port 8055, Docker)
- **Flowise** — AI exercise generation service (Docker)

## Commands

### Client (`cd client`)
```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # Type-check + production build
npm run test:unit    # Vitest unit tests
npm run type-check   # vue-tsc only, no emit
npm run format       # Prettier
```

### Server (`cd server`)
```bash
npm run dev    # Nodemon dev server at localhost:3000
npm run start  # Production
```

### Infrastructure
```bash
docker compose up -d   # Start Directus (8055) and Flowise services
```

## Architecture

### Data Flow
The client communicates **directly with Directus** (via `@directus/sdk`) for all CRUD operations — books, modules, exercises, user progress. The Express server handles file uploads (Cloudinary via Multer) and custom logic that falls outside Directus. Auth tokens (`gb_access_token`, `gb_user_id`) are stored in localStorage.

Flowise is called by the client via its REST API to generate exercises using AI ChatFlow prompts.

### Client Structure (`client/src/`)
- **router/** — Vue Router with per-route meta guards: `requiresAuth` and `requiresAdmin`
- **services/** — All API calls, one file per domain (`auth.ts`, `books.ts`, `exercises.ts`, `flowise.ts`). `client.ts` exports the configured Directus SDK instance.
- **stores/** — Pinia stores (currently minimal; auth state lives in services)
- **types/** — Shared TypeScript interfaces (`User`, `Book`, `Module`, `Exercise`, etc.)
- **utils/gamification.ts** — XP/level calculation logic (exponential curve)
- **utils/exerciseParser.ts** — Parses AI-generated exercise text into typed Exercise objects
- **views/** — One file per page/route
- **components/** — Reusable UI and feature components

### Exercise Types
Four types are supported: `multiple-choice`, `true-false`, `fill-blanks`, `ordering`. These flow through Flowise → `exerciseParser.ts` → `ExerciseGenerator.vue`.

### Server Structure (`server/`)
- `server.js` — Express app with CORS, error middleware, `/health` endpoint
- `config/cloudinaryConfig.js` — Multer + Cloudinary integration
- `utils/db.js` — PostgreSQL connection pool (Sequelize ORM, also has `prisma:migrate` script)
- `utils/error.js` — `ErrorHandler` class extending `Error`
- `middleware/multerErrorHandler.js` — Upload-specific error handling

### Auth Pattern
Auth is Directus-native. The client logs in via the Directus SDK, stores the returned token, and includes it in subsequent SDK calls. Route guards in `router/` check for the token before allowing navigation.

## Key Configuration

- `client/vite.config.ts` — `@` alias maps to `client/src/`
- `client/.env` — `VITE_DIRECTUS_URL`, `VITE_FLOWISE_*` variables
- `server/.env` — `DATABASE_URL`, `JWT_SECRET`, Cloudinary credentials
- `docker-compose.yml` — Flowise and Directus service definitions
