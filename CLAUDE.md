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
      api/:entityName/         # Entity-based API modules (see below)
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

**Entity-Based API Structure:**

Frontend API code is organized by entity in `apps/web/src/app/api/:entityName/`:

```
apps/web/src/app/api/todo/     # Example: todo entity
  todo.types.ts                # TypeScript types and Zod schemas
  todo.api.ts                  # tRPC client wrappers (query/mutation options)
  todo.hooks.ts                # React Query hooks with optimistic updates
  index.ts                     # Re-exports for clean imports
```

**File responsibilities:**

- **`:entityName.types.ts`** — All TypeScript interfaces/types and Zod validation schemas for the entity. Defines input schemas (e.g., `createTodoInputSchema`), inferred types, and hook return types.

- **`:entityName.api.ts`** — tRPC client wrappers that expose query options and mutation options. These wrap `trpc.:entityName.*` calls for use with React Query.

- **`:entityName.hooks.ts`** — React hooks that consume the API layer. Implements optimistic updates, loading states, and business logic. Marked with `"use client"`.

- **`index.ts`** — Barrel file that re-exports types, schemas, API functions, and hooks for clean imports.

**Adding a new entity:**

1. Create `apps/web/src/app/api/:entityName/` directory
2. Create `:entityName.types.ts` with Zod schemas and TypeScript types
3. Create `:entityName.api.ts` with tRPC query/mutation option getters
4. Create `:entityName.hooks.ts` with React hooks (add `"use client"` directive)
5. Create `index.ts` to re-export everything
6. Import from `@/app/api/:entityName` in components

**Key Patterns:**
- tRPC procedures use session context from `packages/api/src/context.ts`
- Protected procedures check session before executing
- Database schema in TypeScript at `packages/db/src/schema/`
- Environment variables validated via Zod in `packages/env/`
- Entity hooks use optimistic updates via React Query's `onMutate`/`onError`/`onSettled`

## Code Style

- **Biome** for linting and formatting (tabs, double quotes)
- **Tailwind classes** auto-sorted by Biome
- Type checking separated from build (`bun run check-types`)
- Pre-push hook enforces lint, type-check, and build

**Always run before committing:**
```bash
bun run check && bun run check-types
```

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

## Task Management

Tasks are tracked in `.ralphy/tasks.yaml`. When asked to create a new task, add it to this file.

**Task format:**
```yaml
tasks:
  - title: Short descriptive title
    description: |
      Detailed description of what needs to be done:
      - File: path/to/file.ts (if applicable)
      - Bullet points for specific steps
      - Include acceptance criteria
    parallel_group: N        # Tasks in same group can run in parallel
    completed: true          # Only add when task is done (omit if pending)
```

**Rules:**
- `parallel_group`: Sequential dependency ordering. Tasks in group N+1 depend on group N completing first. Tasks within the same group can be worked on in parallel.
- `completed`: Only add this field (set to `true`) when marking a task as done. Omit entirely for pending tasks.
- `description`: Use multiline YAML (`|`) for detailed descriptions with bullet points.
