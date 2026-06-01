# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GamiBook is a gamified reading platform where users read books, answer exercises, earn points, and level up. It is a monorepo with three runtime services (the Express server folder does not exist):

- **client** — Vue 3 SPA (port 5173)
- **Directus** — headless CMS and primary datastore (port 8055, Docker, MySQL backend)
- **Flowise** — AI exercise generation service (port 3000 inside Docker)
- **Ollama** — local embedding model service (port 11434 inside Docker)

## Commands

### Client (`cd client`)
```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # Type-check + production build
npm run test:unit    # Vitest unit tests
npm run type-check   # vue-tsc only, no emit
npm run format       # Prettier
```

### Infrastructure
```bash
docker compose up -d   # Start Directus (8055), Flowise (3000), and Ollama (11434)
```

## Architecture

### Data Flow
The client communicates **directly with Directus** (raw `fetch` via `authFetch` / `publicFetch` helpers) for all CRUD operations — books, modules, exercises, user progress, points history, badges, notifications. Flowise is called directly by the client via its REST API to generate exercises using AI ChatFlow prompts. There is **no Express/Node server** — the `server/` folder referenced in older docs no longer exists.

**Token storage:**
- Access token → `sessionStorage` (cleared on tab close) — key `gb_access_token`
- User ID → `localStorage` (persists across sessions) — key `gb_user_id`

All storage access should go through `services/storage.ts` helpers (`getStoredUserId`, `setStoredUserId`, `getAccessToken`, `setAccessToken`, `clearAccessToken`). Direct `localStorage.getItem('gb_user_id')` calls in views/components are a known inconsistency to be cleaned up.

### Client Structure (`client/src/`)

- **router/index.ts** — Vue Router with per-route meta guards: `requiresAuth`, `requiresAdmin`, `userOnly`
- **services/** — All API calls, one file per domain:
  - `client.ts` — `authFetch()`, `publicFetch()`, `getAssetUrl()`, `parseResponse()`, `parseListResponse()`, unauthorised-handler wiring
  - `storage.ts` — Centralised localStorage/sessionStorage helpers for token and user ID
  - `auth.ts` — login, register, fetch/update user, avatar upload, role check (`isAdminUser`)
  - `avatar.ts` — avatar frame customisation (unlock, active frame, per-user customisation records)
  - `books.ts` — books, modules, user collection, QR code unlock, approval management
  - `exercises.ts` — exercises, user attempts, points history, daily challenges, generation quota
  - `finalQuiz.ts` — final quiz attempts (create, fetch, cooldown helper)
  - `badges.ts` — badge tier logic, badge check/update
  - `notifications.ts` — CRUD for the `notifications` Directus collection
  - `flowise.ts` — AI exercise generation via Flowise ChatFlow API
- **stores/**
  - `auth.ts` — user, points, level, level-up modal state, computed role/progress helpers, `syncUserLevelFromPoints`
  - `notifications.ts` — notification list, unread count, optimistic add, mark-read, delete
- **types/** — Shared TypeScript interfaces split by domain:
  - `user.ts` — `User`
  - `book.ts` — `Editora`, `Book`, `Module`, `UserBook`
  - `exercise.ts` — `ExerciseContent`, `Exercise`, `UserExercise`, `UserDailyExercise`, `ExerciseExample`, `FinalQuizAttempt`, `FinalQuizAttemptContent`, `FinalQuizAttemptQuestion`
  - `notification.ts` — `Notification`, `NotificationType`, `CreateNotificationPayload`
  - `avatar.ts` — `AvatarBorder`, `AvatarColor`, `AvatarEffect`, `AvatarShadow`, `AvatarFrame`, `AvatarFrameConfig`, `UserAvatarCustomization`, `AVATAR_FRAMES`
  - `index.ts` — re-exports all public types
- **composables/**
  - `useExerciseRunner.ts` — shared exercise run state (answer, feedback, timer)
  - `useModuleSession.ts` — full module session orchestration (question queue, scoring, badge update)
  - `useBadgeQueue.ts` — badge-unlock notification queue
  - `useToast.ts` — toast notification helpers
- **utils/**
  - `gamification.ts` — Level progression: level 1 = 100 XP, each level +8% (exponential curve via `getLevelProgressFromPoints`)
  - `exerciseParser.ts` — Normalises AI-generated JSON into typed `Exercise` objects
  - `exerciseUtils.ts` — Option parsing, shuffle, correct-answer validation, question text extraction
  - `badgeTiers.ts` — Badge tier order, labels, descriptions (`BADGE_TIERS`, `TIER_LABELS`, `TIER_DESCS`)
  - `confetti.ts` — Confetti animation helper
  - `timing.ts` — Timing/delay utilities
- **styles/theme.css** — Global design system (imported in `main.ts`): color families (deep, teal, amber, pumpkin, mirage, wild, crimson), semantic tokens, spacing scale, radius, stroke, typography (Manrope + Outfit), shadows, gradient presets, animated background keyframes
- **views/** — One file per route (28 total — see Routes section)
- **components/** — UI primitives (`Ui*`) and feature components (see Components section)

### Exercise Types

Two types are supported: `multiple-choice`, `true-false`.
Flow: Flowise → `exerciseParser.ts` → `ExerciseGenerator.vue` (admin) / `Module.vue` (user).

Exercise rules:
- True/false: 1 attempt allowed
- All others: 2 attempts allowed
- 30-second time limit per question
- Points awarded only on correct answers

### Gamification System

- **Points & XP** — Earned per correct exercise, logged in `user_points_history` (source: `exercise` or `daily`)
- **Levels** — Derived from total XP via exponential curve in `gamification.ts`; stored on user record; synced on every login and point refresh
- **Badges** — Per-book achievement tiers based on module completion percentage:
  - Default → Bronze (25%) → Silver (50%) → Gold (75%) → Diamond (100%) → Galaxy (100% + final quiz passed)
- **Daily Exercises** — One challenge per day (24-hour cooldown), tracked in `user_daily_exercise`; unlocked at level 3
- **Daily Streak** — Consecutive days with at least one daily exercise, stored as `exercises_daily_streak` on user; resets if more than 48 hours pass
- **Final Quiz** — Unlocked at Diamond tier; 10 random questions from all modules of a book; 24-hour cooldown on fail
- **Leaderboard** — Global ranking (`Rankings.vue`) with time filters: all-time, week, month, year
- **Study Mode** — Free-practice mode (`StudyMode.vue`) to replay all exercises for a book without scoring

### Avatar & Customisation System

- Avatar borders, colours, effects, and shadows are stored on the user record in Directus (`avatar_border`, `avatar_color`, `avatar_effect`, `avatar_shadow`)
- Avatar frames (`AvatarFrame`) are managed via `user_avatar_customizations` collection and gated by `requiredLevel` in `AVATAR_FRAMES`
- Background themes are stored on the user record (`background_theme`) and mirrored to `localStorage` (`gb_bg`) for instant load before auth; also stored in several `localStorage` keys (`gb_av_border`, `gb_av_color`, `gb_av_effect`, `gb_av_shadow`) for pre-auth display

### Role System

Four roles exist in Directus:
- `admin` / `admin absoluto` — Full access, admin views
- `editora` / `autor` — Treated as admin for route guards; can generate exercises (quota: 50/day, enforced client-side only)
- Regular users — Access only to user views

Route guards: `requiresAdmin` redirects non-admins to `/app`; `userOnly` redirects admins to `/admin`.

### Routes

**Public:**
- `/` → `Home.vue` — Landing page
- `/login` → `Login.vue`
- `/register` → `Register.vue`

**User (requiresAuth + userOnly):**
- `/app` → `Dashboard.vue` — User dashboard (streak, recent book, badges, daily status)
- `/leaderboard` → `Rankings.vue` — Global rankings with time filters
- `/user/:id` → `UserProfile.vue` — Public user profile
- `/collection` → `Collection.vue` — Book library with search and filters
- `/book/:id` → `Book.vue` — Book detail and modules list
- `/book/:bookId/module/:moduleId` → `Module.vue` — Exercise runner (scoring, badge update)
- `/book/:bookId/study` → `StudyMode.vue` — Free-practice mode (no scoring)
- `/book/:bookId/final-quiz` → `FinalQuiz.vue` — Final quiz (10 questions)
- `/daily-exercise` → `DailyExercise.vue` — Daily challenge
- `/help` → `Help.vue` — FAQ

**Auth-required (any role):**
- `/unlock/:code` → `Unlock.vue` — QR code book unlock
- `/settings/conta` → `SettingsAccount.vue`
- `/settings/dados` → `SettingsUserData.vue`
- `/settings/notificacoes` → `SettingsNotifications.vue`
- `/settings/aparencia` → `Appearance.vue`
- `/settings/privacidade` → `Privacy.vue`

**Admin (requiresAuth + requiresAdmin):**
- `/admin` → `AdminHome.vue` — Admin dashboard
- `/admin/guide` → `AdminGuide.vue` — Admin usage guide
- `/exercise-generator` → `ExerciseGenerator.vue` — AI exercise generator
- `/ui-kit` → `UiKitPreview.vue` — Component gallery

**Note:** `AdminStats.vue` and `AdminBooks.vue` exist as view files but are not wired into the router yet.

### Components

**UI Primitives** (`components/ui/Ui*`): `UiButton`, `UiCard`, `UiChip`, `UiInput`, `UiTextarea`, `UiSelect`, `UiCheckbox`, `UiRadio`, `UiSwitch`, `UiSegmented`, `UiSlider`, `UiSearch`, `UiIconButton`, `UiPillButton`, `UiBadge`, `UiAvatar`, `UiProgress`, `UiSkeleton`, `UiToast`, `UiToastContainer`, `UiModal`, `UiConfirmModal`, `UiFilePicker`, `UiOptionPicker`, `UiScrollArea`, `UiStatCard`, `UiSideMenuItem`

**Feature Components** (`components/ui/`): `BookBadge` (animated tier badges), `BookMockup`, `BookShelf`, `BookModeModal`, `ModeCard`, `ExerciseOption`, `QuestionCard`, `BadgeUnlockModal`, `BookUnlockModal`, `LevelUpModal`, `ConfettiOverlay`, `PodiumItem`, `RankingListItem`, `NotificationPanel`, `NotifActionBar`, `AdminActivityLog`, `UiResultPill`

**Layout** (`components/layout/`): `AppSidebar`, `AppTopbar`, `NavItem`

**Help** (`components/help/`): `HelpFaq`, `HelpFaqItem`

**Exercise Generator** (`components/exercise-generator/`): `BookGrid`, `ModuleGrid`, `GeneratorConfigPanel`, `GeneratorLoadingOverlay`, `GeneratedExercisesList`, `ApprovedExercisesList`, `ExerciseQuotaPanel`

**Other**: `AvatarFrameSelector`

## Key Configuration

- `client/vite.config.ts` — `@` alias maps to `client/src/`; manual chunks: `vendor-vue`, `vendor-icons`, `vendor-qr`
- `client/.env` — `VITE_DIRECTUS_URL` (required), `VITE_FLOWISE_URL` (optional, defaults to `http://localhost:3000`), `VITE_FLOWISE_CHATFLOW_ID` (optional, has hardcoded fallback — should always be set)
- `.env` (root) — Qdrant and Ollama config used by Directus extensions (not imported by the client)
- `docker-compose.yml` — Directus (MySQL, port 8055), Flowise (port 3000), Ollama (port 11434)

## Design System Rules

All visual styling must use CSS variables from `styles/theme.css`. Never use raw hex colours, `px` values outside the spacing scale, or ad-hoc font families. Key tokens:
- Colours: `--color-{family}-{shade}` or semantic aliases (`--color-primary`, `--color-accent`, `--color-surface`, `--color-text`, `--color-error`)
- Spacing: `--space-{050|100|150|200|300|400|500|600|700|800|900|1000}`
- Radius: `--radius-{100|200|400|full}`
- Typography: `--font-base` (Manrope) for body, `--font-display` (Outfit) for headings/brand
- Shadows: `--shadow-soft`, `--shadow-strong`
- Icons: always use `@heroicons/vue/24/outline` with stroke `--icon-stroke` (2.25). Never use emojis.
