# AGENTS.md

Quick reference for AI assistants. See [CLAUDE.md](./CLAUDE.md) for detailed documentation.

## Stack

- **Runtime:** Bun
- **Frontend:** Next.js 16 (React 19), TailwindCSS, shadcn/ui
- **API:** tRPC (type-safe RPC)
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better-Auth
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting:** Biome

## Commands

```bash
bun run dev              # Start dev server
bun run build            # Build all
bun run check            # Biome lint/format
bun run check-types      # TypeScript check
bun run test             # Unit tests
bun run test:e2e         # E2E tests
bun run db:push          # Push schema changes
```

## Structure

```
apps/web/                # Next.js app (port 4757)
  src/app/api/:entity/   # Entity API modules (types, api, hooks, utils)
  src/components/        # React components
  src/hooks/             # Shared hooks
  e2e/                   # Playwright tests

packages/
  api/                   # tRPC routers
  auth/                  # Better-Auth config
  db/                    # Drizzle schema
  env/                   # Env validation
```

## Rules

1. Use TypeScript strict mode
2. Use tRPC for all API endpoints
3. Validate inputs with Zod
4. Use Drizzle ORM, not raw SQL
5. Run `bun run check && bun run check-types` before commits
6. Follow existing patterns in the codebase
