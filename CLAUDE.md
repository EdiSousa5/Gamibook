# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GamiBook is a gamified reading platform where users read books, answer exercises, earn points, and level up. It is a monorepo with four runtime services:

- **client** — Vue 3 SPA (port 5173)
- **server** — Express.js REST API (port 3000, currently a placeholder — no active routes)
- **Directus** — headless CMS and primary datastore (port 8055, Docker, MySQL backend)
- **Flowise** — AI exercise generation service (port 3000 inside Docker)

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
The client communicates **directly with Directus** (via `@directus/sdk`) for all CRUD operations — books, modules, exercises, user progress, points history, badges. The Express server exists but currently has no active routes; all API calls go through Directus. Flowise is called directly by the client via its REST API to generate exercises using AI ChatFlow prompts.

**Token storage:**
- Access token → `sessionStorage` (cleared on tab close)
- User ID → `localStorage` (persists across sessions)

### Client Structure (`client/src/`)

- **router/** — Vue Router with per-route meta guards: `requiresAuth`, `requiresAdmin`, `userOnly`
- **services/** — All API calls, one file per domain:
  - `client.ts` — Directus SDK instance, `authFetch()`, asset URL helper, token refresh + auto-logout on 401
  - `auth.ts` — login, register, fetch/update user, avatar upload, role check
  - `books.ts` — books, modules, user collection, QR code unlock, approval management
  - `exercises.ts` — exercises, user attempts, points history, daily challenges, generation quota
  - `badges.ts` — badge tier calculation, badge check/update, final quiz question selection
  - `flowise.ts` — AI exercise generation for modules and daily challenges
- **stores/auth.ts** — Single Pinia store: user, points, level, level-up modal state, computed role/progress helpers
- **types/** — Shared TypeScript interfaces: `User`, `Book`, `Module`, `Exercise`, `DailyExercise`, `UserExercise`, `UserPointsHistory`, `UserBook`
- **composables/** — `useExerciseRunner.ts`, `useToast.ts`
- **utils/**
  - `gamification.ts` — Level progression: level 1 = 100 XP, each level +5% (exponential curve)
  - `exerciseParser.ts` — Normalises AI-generated JSON into typed `Exercise` objects
  - `exerciseUtils.ts` — Option parsing, shuffle, correct-answer validation, question text extraction
- **views/** — One file per route (see Routes section below)
- **components/** — UI primitives (`Ui*`) and feature components (see Components section)

### Exercise Types

Four types are supported: `multiple-choice`, `true-false`, `fill-blanks`, `ordering`.
Flow: Flowise → `exerciseParser.ts` → `ExerciseGenerator.vue` (admin) / `Module.vue` (user).

Exercise rules:
- True/false: 1 attempt allowed
- All others: 2 attempts allowed
- 30-second time limit per question
- Points awarded only on correct answers

### Gamification System

- **Points & XP** — Earned per correct exercise, logged in `user_points_history` (source: `exercise` or `daily`)
- **Levels** — Derived from total XP via exponential curve in `gamification.ts`; stored on user record
- **Badges** — Per-book achievement tiers based on module completion percentage:
  - Default → Bronze (25%) → Silver (50%) → Gold (75%) → Diamond (100%) → Galaxy (100% + final quiz passed)
- **Daily Exercises** — One challenge per book per day (24-hour cooldown), tracked in `user_daily_exercises`
- **Daily Streak** — Consecutive days with at least one daily exercise, stored as `exercises_daily_streak` on user
- **Final Quiz** — Unlocked at Diamond tier; 10 random questions from all modules of a book
- **Leaderboard** — Global ranking with time filters: all-time, week, month, year

### Role System

Four roles exist in Directus:
- `admin` / `admin absoluto` — Full access, admin views
- `editora` / `autor` — Treated as admin for route guards; can generate exercises (quota: 50/day)
- Regular users — Access only to user views

Route guards: `requiresAdmin` redirects non-admins to `/app`; `userOnly` redirects admins to `/admin`.

### Routes

**Public:**
- `/` — Landing page
- `/login` — Login
- `/register` — Registration

**User (requiresAuth + userOnly):**
- `/app` — Dashboard
- `/leaderboard` — Global rankings
- `/collection` — Book library with search and filters
- `/book/:id` — Book detail and modules list
- `/book/:bookId/module/:moduleId` — Exercise runner (spaced repetition, badge update)
- `/book/:bookId/final-quiz` — Final quiz (10 questions)
- `/daily-exercise` — Daily challenge
- `/help` — FAQ
- `/unlock/:code` — QR code book unlock

**Settings (requiresAuth, any role):**
- `/settings/conta` — Account info
- `/settings/dados` — User data
- `/settings/notificacoes` — Notifications
- `/settings/aparencia` — Appearance
- `/settings/privacidade` — Privacy

**Admin (requiresAuth + requiresAdmin):**
- `/admin` — Admin dashboard
- `/admin/stats` — Statistics
- `/exercise-generator` — AI exercise generator
- `/ui-kit` — Component gallery

### Components

**UI Primitives** (`Ui*`): `UiButton`, `UiCard`, `UiChip`, `UiInput`, `UiTextarea`, `UiSelect`, `UiCheckbox`, `UiRadio`, `UiSwitch`, `UiSegmented`, `UiSlider`, `UiSearch`, `UiIconButton`, `UiPillButton`, `UiBadge`, `UiAvatar`, `UiProgress`, `UiSkeleton`, `UiToast`

**Feature Components**: `BookBadge` (animated tier badges), `BookMockup`, `BookShelf`, `ExerciseOption`, `BadgeUnlockModal`, `BookUnlockModal`, `LevelUpModal`, `PodiumItem`, `RankingListItem`, `PageHeader`, `AppSidebar`, `AppTopbar`

**Exercise Generator Components**: `BookGrid`, `ModuleGrid`, `GeneratorConfigPanel`, `GeneratorLoadingOverlay`, `GeneratedExercisesList`, `ApprovedExercisesList`, `ExerciseQuotaPanel`

### Server Structure (`server/`)

Currently a near-empty Express placeholder — no active API routes yet.

- `server.js` — CORS (localhost:5173), JSON parser, request timing logger, `/api/health`, 404 + error middleware
- `config/cloudinaryConfig.js` — Multer + Cloudinary upload configuration (wired up, not yet used in routes)
- `utils/error.js` — `ErrorHandler` class extending `Error` with `statusCode`
- `utils/response.js` — `successResponse()` helper
- `middleware/multerErrorHandler.js` — Multer-specific error handling

## Key Configuration

- `client/vite.config.ts` — `@` alias maps to `client/src/`
- `client/.env` — `VITE_DIRECTUS_URL` (required)
- `server/.env` — `DATABASE_URL`, `JWT_SECRET`, Cloudinary credentials, `PORT`, `HOST`
- `docker-compose.yml` — Directus (MySQL, port 8055) and Flowise (port 3000) service definitions
