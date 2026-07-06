# Cinephiles

> Social film & TV review platform — a TMDB-powered, full-stack cinema community.

Cinephiles is a social cinema platform where users discover, rate and review
movies and TV shows, build collection lists, follow other users and engage with
the community.

## Features

- **Discover** — browse and search TMDB movies & TV shows; trending, popular and
  upcoming pages; person pages with filmography.
- **Reviews** — 0.5–5 star ratings, spoiler-protected texts, comments, likes and
  a profanity filter.
- **Lists** — Watched / Watchlist / Favorites plus custom lists with drag-and-drop
  ordering and public/private visibility.
- **Social** — follow users, activity feed, `@mentions`, public profiles with
  favorite films, actor and director.
- **Blocking** — blocked users can't follow you, notify you or comment on your reviews.
- **Notifications** — in-app bell with deep links for follows, likes, comments,
  mentions and announcements.
- **Moderation** — report reviews/comments; admins triage them in a report queue.
- **Admin panel** — dashboard & statistics, user/content management with bulk
  actions and CSV export, announcements, audit log.
- **Auth & security** — JWT access/refresh sessions, rate limiting, account
  suspension enforced on every request.
- **UX** — Turkish/English i18n, dark & light themes, responsive design.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express, TypeScript, Prisma (PostgreSQL), Redis |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Query, Zustand |
| **Auth** | JWT (access + refresh), bcrypt, rate limiting |
| **Data** | TMDB API (Redis cache), Zod validation |
| **i18n** | i18next (TR/EN) |

## Project Structure

```
cinephiles/
├── backend/                 # Express REST API
│   ├── prisma/              # Schema, migrations and seed script
│   └── src/
│       ├── api/             # Feature modules: auth, content, users, reviews,
│       │                    # lists, notifications, admin (routes/controller/
│       │                    # service/validator per module)
│       ├── config/          # Env validation, Prisma and Redis clients
│       ├── middleware/      # Auth, role guard, Zod validation, rate limit,
│       │                    # avatar upload, error handling
│       ├── services/        # TMDB client, Redis cache, profanity filter
│       └── utils/           # JWT, CSV, mentions, logger, HTTP errors
├── frontend/                # Vite + React SPA
│   ├── public/locales/      # i18n translations (tr / en)
│   └── src/
│       ├── api/             # Typed Axios API clients
│       ├── app/             # Router and app-level providers
│       ├── components/      # Shared UI (layout, content cards, guards)
│       ├── features/        # Feature state & UI (auth, review, notifications…)
│       ├── hooks/           # Reusable hooks (debounce, click-outside…)
│       ├── lib/             # i18n, TMDB helpers, small utilities
│       ├── pages/           # Route-level pages (incl. admin panel)
│       └── types/           # Shared TypeScript types
├── docker-compose.yml       # PostgreSQL + Redis for local development
├── LICENSE                  # MIT
└── package.json             # pnpm workspace root
```

## Quick Start

### 1. Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### 2. Start PostgreSQL and Redis
```bash
docker compose up -d
```

### 3. Backend
```bash
cd backend
cp .env.example .env       # fill in TMDB_API_KEY and the JWT secrets
pnpm install
pnpm prisma migrate dev    # apply migrations
pnpm seed                  # optional: seed demo data
pnpm dev                   # http://localhost:4000
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev                   # http://localhost:5173
```

### Seed credentials

After running `pnpm seed`, you can sign in with:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `demo` | `user1234` |

## Scripts

### Root (workspace)
| Command | Description |
|---------|-------------|
| `pnpm test` | Run every package's test suite |
| `pnpm build` | Build every package |
| `pnpm lint` | ESLint over the whole monorepo |

### Backend
| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server (tsx watch) |
| `pnpm build` | TypeScript build |
| `pnpm start` | Run production build |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Vitest unit/integration tests |
| `pnpm seed` | Seed the database with demo data |
| `pnpm prisma:studio` | Prisma Studio (database browser) |

### Frontend
| Command | Description |
|---------|-------------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Type-check + production build |
| `pnpm test` | Vitest unit tests |
| `pnpm preview` | Preview the production build |

## Testing

Backend and frontend both use [Vitest](https://vitest.dev). Backend tests are
hermetic: Prisma is mocked, so no database, Redis or `.env` file is required —
they run out of the box in CI (`pnpm test` from the repo root).

## License

This project is licensed under the [MIT License](LICENSE).
