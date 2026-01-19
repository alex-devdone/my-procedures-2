# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack TypeScript monorepo built with the Better-T-Stack template. Uses Next.js 16 (React 19) for frontend, tRPC for type-safe APIs, Drizzle ORM with PostgreSQL, and Better-Auth for authentication.

## Common Commands

```bash
bun install                    # Install dependencies
bun run dev                    # Start dev server (all apps)
bun run build                  # Build all apps
bun run check-types            # TypeScript type checking across monorepo
bun run check                  # Run Biome formatting & linting

# Database
bun run db:push               # Push schema changes to database
bun run db:studio             # Open Drizzle Studio (database UI)
bun run db:generate           # Generate Drizzle migrations
bun run db:migrate            # Apply migrations
```

## Architecture

**Monorepo Structure (Turborepo + Bun workspaces):**

```
apps/
  web/                         # Next.js 16 fullstack app (port 3001)
    src/app/                   # App Router pages and API routes
    src/components/            # React components (shadcn/ui in ui/)
    src/utils/trpc.ts          # tRPC client setup

packages/
  api/                         # tRPC API layer
    src/index.ts               # tRPC initialization & procedures
    src/routers/               # Route handlers (todo.ts, etc.)
  auth/                        # Better-Auth configuration
  db/                          # Drizzle ORM layer
    src/schema/                # Database schema definitions
    src/migrations/            # Generated migrations
    drizzle.config.ts          # Drizzle Kit config
  env/                         # Type-safe environment validation (t3-oss/env)
  config/                      # Shared TypeScript config
```

**Key Patterns:**
- tRPC procedures use session context from `packages/api/src/context.ts`
- Protected procedures check session before executing
- Database schema in TypeScript at `packages/db/src/schema/`
- Environment variables validated via Zod in `packages/env/`

## Code Style

- **Biome** for linting and formatting (tabs, double quotes)
- **Tailwind classes** auto-sorted by Biome
- Type checking separated from build (`bun run check-types`)
- Pre-push hook enforces lint, type-check, and build

## Environment Variables

Required in `apps/web/.env`:
```
BETTER_AUTH_SECRET         # Min 32 chars
BETTER_AUTH_URL            # Auth callback URL
DATABASE_URL               # PostgreSQL connection string
```

Optional:
```
GOOGLE_GENERATIVE_AI_API_KEY  # For AI features
```
